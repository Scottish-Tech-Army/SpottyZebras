import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { ageFromDob } from '@/lib/age'
import { isAgeEligible } from '@/lib/events/eligibility'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const fail = (error: string, status: number) => Response.json({ error }, { status })

/**
 * Starts the payment for a PAID event booking. Body: { eventId, childIds }.
 *
 * This mirrors the RSVP validation in /api/bookings (ownership, age, capacity)
 * but, instead of writing bookings, it creates a Stripe PaymentIntent carrying
 * everything the webhook needs to record the payment AND the bookings once the
 * card actually settles. No booking rows are written here — the Stripe webhook
 * (`payment_intent.succeeded`, type='event_booking') is the single authoritative
 * writer, exactly like donations. Returns the clientSecret for the card form.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)
  const uid = userData.user.id

  let body: { eventId?: string; childIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return fail('Invalid request.', 400)
  }
  const eventId = body.eventId
  const childIds = Array.isArray(body.childIds) ? [...new Set(body.childIds)] : []
  if (!eventId || childIds.length === 0) return fail('Pick at least one child.', 400)

  // Event must exist and be paid (free events go through /api/bookings instead).
  const { data: event } = await admin
    .from('event')
    .select('id, title, price, age_range_min, age_range_max, max_capacity')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) return fail('Event not found.', 404)
  const price = Number(event.price)
  if (!(price > 0)) return fail('This is a free event — no payment is needed.', 400)

  // The children must all belong to this parent.
  const { data: kids } = await admin
    .from('child')
    .select('id, date_of_birth')
    .eq('parent_id', uid)
    .in('id', childIds)
  if (!kids || kids.length !== childIds.length) return fail('Those children can’t be booked.', 403)

  // Every selected child must be age-eligible.
  const ineligible = kids.some(
    c => !isAgeEligible(ageFromDob(c.date_of_birth), event.age_range_min, event.age_range_max),
  )
  if (ineligible) return fail('A selected child isn’t eligible for this event.', 400)

  // Atomically hold the spots (10-min pending reservation) BEFORE taking payment.
  // `book_event_spots` locks the event row, so two parents can never both claim
  // the last spot — the loser is refused here and never reaches the card screen.
  // The hold auto-expires (and is lazily cleaned) if the payment is abandoned.
  const HOLD_MINUTES = 10
  const { data: reservation, error: rpcErr } = await admin.rpc('book_event_spots', {
    p_event_id: eventId,
    p_parent_id: uid,
    p_child_ids: childIds,
    p_status: 'pending',
    p_hold_minutes: HOLD_MINUTES,
    p_payment_id: null,
  })
  if (rpcErr) {
    console.error('Spot reservation failed:', rpcErr)
    return fail('Could not reserve the spot. Please try again.', 500)
  }
  if (reservation?.full) {
    return fail('This event just filled up — those spots are no longer available.', 409)
  }
  const reserved: string[] = reservation?.child_ids ?? []
  if (reserved.length === 0) {
    // Every selected child already has a spot, or a payment for them is in flight.
    return fail('Those children are already booked (or a payment is in progress).', 409)
  }

  // Payer details for the receipt + the payment ledger (from the parent's profile).
  const [{ data: appUser }, { data: profile }] = await Promise.all([
    admin.from('app_user').select('full_name').eq('id', uid).maybeSingle(),
    admin.from('parent_profile').select('email').eq('user_id', uid).maybeSingle(),
  ])
  const payerName = (appUser?.full_name ?? '').trim()
  const payerEmail = profile?.email ?? userData.user.email ?? ''

  const amount = Math.round(price * reserved.length * 100) // pounds → pence

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      payment_method_types: ['card'],
      receipt_email: payerEmail || undefined,
      metadata: {
        type: 'event_booking',
        event_id: eventId,
        event_title: event.title ?? '',
        parent_id: uid,
        // Exactly the children whose spots we just held (already-booked ones dropped).
        child_ids: reserved.join(','),
        payer_name: payerName,
        payer_email: payerEmail,
      },
    })

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id, // so the client can release the hold on leave
      amount: amount / 100, // pounds, for the payment screen
      eventTitle: event.title,
      childIds: reserved,
      holdExpiresAt: reservation?.expires_at ?? null, // ISO deadline for the countdown
    })
  } catch (err) {
    // Couldn't start payment — release the hold so the spot isn't stuck for 15 min.
    await admin
      .from('booking')
      .delete()
      .eq('event_id', eventId)
      .eq('parent_id', uid)
      .eq('status', 'pending')
      .in('child_id', reserved)
    const message = err instanceof Error ? err.message : 'Could not start the payment'
    return fail(message, 500)
  }
}

/**
 * Releases a spot the parent was holding but didn't pay for — called when they
 * leave the payment screen (back, tab close, or the 10-min timer running out).
 * Deletes their pending holds for the event and cancels the PaymentIntent so the
 * seat frees up immediately instead of waiting for the hold to expire. Body:
 *   { eventId: string, paymentIntentId?: string }
 */
export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)
  const uid = userData.user.id

  let body: { eventId?: string; paymentIntentId?: string }
  try {
    body = await request.json()
  } catch {
    return fail('Invalid request.', 400)
  }
  if (!body.eventId) return fail('Missing eventId.', 400)

  // Free the held seat(s). Only ever this parent's own PENDING rows — confirmed
  // (paid) bookings are never touched, so a release racing a completed payment
  // can't delete a real booking.
  await admin
    .from('booking')
    .delete()
    .eq('event_id', body.eventId)
    .eq('parent_id', uid)
    .eq('status', 'pending')

  // Best-effort cancel of the unpaid PaymentIntent (no-op if it already settled).
  if (body.paymentIntentId) {
    try {
      await stripe.paymentIntents.cancel(body.paymentIntentId)
    } catch {
      // Already succeeded/canceled — nothing to do.
    }
  }

  return Response.json({ ok: true })
}
