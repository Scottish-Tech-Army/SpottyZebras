import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Subscriptions need a Product to hang the recurring Price on. Set
// STRIPE_DONATION_PRODUCT_ID in prod; in dev we lazily create one and cache it
// for the lifetime of the server process.
let cachedProductId: string | null = null
async function getDonationProductId(): Promise<string> {
  if (process.env.STRIPE_DONATION_PRODUCT_ID) return process.env.STRIPE_DONATION_PRODUCT_ID
  if (cachedProductId) return cachedProductId
  const product = await stripe.products.create({ name: 'Monthly donation' })
  cachedProductId = product.id
  return cachedProductId
}

export async function POST(request: Request) {
  const {
    amountPence, name, email, giftAid,
    addressLine1, addressLine2, city, postcode,
  } = await request.json()

  if (!amountPence || amountPence < 100) {
    return Response.json({ error: 'Amount must be at least £1' }, { status: 400 })
  }
  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
  const productId = await getDonationProductId()

  // A Customer ties the recurring payments and future invoices to one donor.
  const customer = await stripe.customers.create({
    name,
    email,
    address: giftAid
      ? {
          line1: addressLine1 || undefined,
          line2: addressLine2 || undefined,
          city: city || undefined,
          postal_code: postcode || undefined,
          country: 'GB',
        }
      : undefined,
    metadata: { gift_aid: giftAid ? 'yes' : 'no' },
  })

  // default_incomplete: create the subscription but wait for the first payment
  // to be confirmed on the client before it becomes active. Stripe then
  // auto-charges every month afterwards.
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price_data: {
          currency: 'gbp',
          product: productId,
          unit_amount: amountPence,
          recurring: { interval: 'month' },
        },
      },
    ],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
      payment_method_types: ['card'],
    },
    expand: ['latest_invoice.confirmation_secret'],
    metadata: {
      type: 'donation',
      donor_name: name,
      donor_email: email,
      gift_aid: giftAid ? 'yes' : 'no',
      address_line1: addressLine1 || '',
      address_line2: addressLine2 || '',
      city: city || '',
      postcode: postcode || '',
    },
  })

  const invoice = subscription.latest_invoice as Stripe.Invoice
  const clientSecret = invoice.confirmation_secret?.client_secret

  if (!clientSecret) {
    return Response.json({ error: 'Could not initialise subscription payment' }, { status: 500 })
  }

  return Response.json({ clientSecret })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start the subscription'
    return Response.json({ error: message }, { status: 500 })
  }
}
