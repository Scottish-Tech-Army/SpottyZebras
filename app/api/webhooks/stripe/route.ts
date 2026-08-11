import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Stripe webhook — the authoritative writer of the `payment` ledger. Stripe calls
 * this on settled payments; we verify the signature, then upsert a row. It's
 * idempotent on stripe_payment_intent_id, so Stripe's automatic retries (and any
 * duplicate deliveries) can never double-record.
 *
 * - One-off donations (`payment_intent.succeeded`, type='donation'): donor details
 *   are on the PaymentIntent metadata (set in create-payment-intent), no lookups.
 * - Paid event bookings (`payment_intent.succeeded`, type='event_booking'): the PI
 *   metadata carries the event, parent and children; we write the payment row and
 *   the confirmed booking rows here (never at checkout), so this is the only writer.
 * - Recurring donations (`invoice_payment.paid`): the event gives the PI id +
 *   amount; donor details live on the subscription, so we resolve
 *   invoice → subscription to read them. Fires for the first charge and every
 *   month after.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return new Response('Webhook not configured', { status: 500 })
  }

  // Signature verification needs the RAW body, not parsed JSON.
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      if (pi.metadata?.type === 'event_booking') await recordEventBooking(pi)
      else await recordOneOffDonation(pi)
    } else if (event.type === 'invoice_payment.paid') {
      await recordRecurringDonation(event.data.object)
    }
    // Other event types are acknowledged and ignored.
  } catch (err) {
    // Non-2xx makes Stripe retry with backoff, so a transient DB failure self-heals.
    console.error('Stripe webhook handling failed:', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}

/** Writes a one-off donation payment row from a succeeded PaymentIntent. */
async function recordOneOffDonation(pi: Stripe.PaymentIntent) {
  const md = pi.metadata ?? {}
  // Only our one-off donations carry type='donation' on the PI. Subscription
  // charges don't (their metadata lives on the subscription) — skip them here.
  if (md.type !== 'donation') return

  const admin = createAdminClient()
  const row = {
    type: 'donation',
    status: 'succeeded',
    amount: (pi.amount_received ?? pi.amount) / 100, // Stripe pence → pounds
    currency: pi.currency,
    stripe_payment_intent_id: pi.id,
    is_gift_aid: md.gift_aid === 'yes',
    donor_first_name: md.donor_first_name || null,
    donor_last_name: md.donor_last_name || null,
    donor_email: md.donor_email || pi.receipt_email || null,
    donor_address_line_1: md.address_line1 || null,
    donor_address_line_2: md.address_line2 || null,
    donor_town: md.city || null,
    donor_postcode: md.postcode || null,
    paid_at: new Date(pi.created * 1000).toISOString(),
  }

  const { error } = await admin
    .from('payment')
    .upsert(row, { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true })
  if (error) throw error
}

/** Writes a paid event booking: one payment row, then confirms the spots the
 *  parent held at checkout (flips their pending bookings to confirmed, linked by
 *  payment_id). Idempotent — the payment upserts on its PaymentIntent id, and
 *  confirm_held_booking only touches this parent's rows, so retries/duplicate
 *  deliveries can't double-record or double-book. */
async function recordEventBooking(pi: Stripe.PaymentIntent) {
  const md = pi.metadata ?? {}
  const eventId = md.event_id
  const parentId = md.parent_id
  const childIds = (md.child_ids ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!eventId || !parentId || childIds.length === 0) return

  const admin = createAdminClient()

  // Upsert the payment ledger row and get its id (to link the bookings).
  const { data: payment, error: payErr } = await admin
    .from('payment')
    .upsert(
      {
        type: 'event_booking',
        status: 'succeeded',
        amount: (pi.amount_received ?? pi.amount) / 100, // Stripe pence → pounds
        currency: pi.currency,
        stripe_payment_intent_id: pi.id,
        parent_id: parentId,
        event_id: eventId,
        event_payer_name: md.payer_name || null,
        event_payer_email: md.payer_email || pi.receipt_email || null,
        paid_at: new Date(pi.created * 1000).toISOString(),
      },
      { onConflict: 'stripe_payment_intent_id' },
    )
    .select('id')
    .single()
  if (payErr) throw payErr

  // Turn the held (pending) spots into confirmed bookings, attaching the payment.
  const { error: rpcErr } = await admin.rpc('confirm_held_booking', {
    p_event_id: eventId,
    p_parent_id: parentId,
    p_child_ids: childIds,
    p_payment_id: payment.id,
  })
  if (rpcErr) throw rpcErr
}

/** Writes a recurring-donation payment row from a paid invoice payment. The donor
 *  details live on the subscription (set at signup), so we resolve
 *  invoice → subscription to read its metadata. Runs for every monthly charge. */
async function recordRecurringDonation(ip: Stripe.InvoicePayment) {
  if (ip.status !== 'paid') return

  const amountPaid = ip.amount_paid
  if (!amountPaid) return // nothing actually settled

  const piRef = ip.payment?.payment_intent
  const piId = typeof piRef === 'string' ? piRef : piRef?.id
  if (!piId) return // paid by something other than a PaymentIntent — skip

  const invoiceId = typeof ip.invoice === 'string' ? ip.invoice : ip.invoice?.id
  if (!invoiceId) return

  // invoice → subscription → its metadata (the donor details captured at signup)
  const invoice = await stripe.invoices.retrieve(invoiceId)
  const subRef = invoice.parent?.subscription_details?.subscription
  const subId = typeof subRef === 'string' ? subRef : subRef?.id
  if (!subId) return

  const subscription = await stripe.subscriptions.retrieve(subId)
  const md = subscription.metadata ?? {}
  if (md.type !== 'donation') return // only our donation subscriptions

  const admin = createAdminClient()
  const row = {
    type: 'donation',
    status: 'succeeded',
    amount: amountPaid / 100, // Stripe pence → pounds
    currency: ip.currency,
    stripe_payment_intent_id: piId,
    stripe_invoice_id: invoiceId,
    stripe_subscription_id: subId,
    is_gift_aid: md.gift_aid === 'yes',
    donor_first_name: md.donor_first_name || null,
    donor_last_name: md.donor_last_name || null,
    donor_email: md.donor_email || null,
    donor_address_line_1: md.address_line1 || null,
    donor_address_line_2: md.address_line2 || null,
    donor_town: md.city || null,
    donor_postcode: md.postcode || null,
    paid_at: ip.status_transitions?.paid_at
      ? new Date(ip.status_transitions.paid_at * 1000).toISOString()
      : null,
  }

  const { error } = await admin
    .from('payment')
    .upsert(row, { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true })
  if (error) throw error
}
