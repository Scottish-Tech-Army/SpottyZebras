import { createAdminClient } from '@/lib/supabase-admin'
import { ageFromDob } from '@/lib/age'
import { isAgeEligible } from '@/lib/events/eligibility'

export const runtime = 'nodejs'

const fail = (error: string, status: number) => Response.json({ error }, { status })

/**
 * The signed-in parent's bookings as { eventId, childId } pairs, so the RSVP
 * dialog can mark children who are already going and disable their row.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)

  const { data: rows, error: qErr } = await admin
    .from('booking')
    .select('event_id, child_id')
    .eq('parent_id', userData.user.id)
  if (qErr) {
    console.error('Bookings query failed:', qErr)
    return fail('Could not load bookings.', 500)
  }

  const bookings = (rows ?? []).map(b => ({ eventId: b.event_id, childId: b.child_id }))
  return Response.json({ bookings })
}

/**
 * RSVPs a parent's children to an event (free events only, for now). Body:
 *   { eventId: string, childIds: string[] }
 *
 * Everything the client checks is re-checked here: the children must belong to
 * the caller, the event must be free, and each child must be age-eligible.
 * Children already booked for the event are skipped, so a repeat RSVP is a no-op.
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

  // Event must exist and (for now) be free.
  const { data: event } = await admin
    .from('event')
    .select('id, price, age_range_min, age_range_max, max_capacity')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) return fail('Event not found.', 404)
  if (Number(event.price) > 0) return fail('Booking for paid events isn’t available yet.', 400)

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

  // Skip children already booked, so a repeat RSVP doesn't duplicate.
  const { data: existing } = await admin
    .from('booking')
    .select('child_id')
    .eq('event_id', eventId)
    .in('child_id', childIds)
  const already = new Set((existing ?? []).map(b => b.child_id))
  const toBook = childIds.filter(id => !already.has(id))

  // Enforce capacity (when the event has one). Count every booking, then make
  // sure the NEW ones still fit. (Small race window at this scale — acceptable.)
  if (event.max_capacity != null && toBook.length > 0) {
    const { count } = await admin
      .from('booking')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
    const remaining = event.max_capacity - (count ?? 0)
    if (toBook.length > remaining) {
      return fail(
        remaining <= 0
          ? 'This event is now full.'
          : `Only ${remaining} spot${remaining === 1 ? '' : 's'} left for this event.`,
        409,
      )
    }
  }

  if (toBook.length > 0) {
    const rows = toBook.map(child_id => ({
      event_id: eventId,
      child_id,
      parent_id: uid,
      status: 'confirmed',
    }))
    const { error: insErr } = await admin.from('booking').insert(rows)
    if (insErr) {
      console.error('Booking insert failed:', insErr)
      return fail('Could not complete the booking. Please try again.', 500)
    }
  }

  return Response.json({ ok: true, booked: toBook, alreadyBooked: [...already] })
}
