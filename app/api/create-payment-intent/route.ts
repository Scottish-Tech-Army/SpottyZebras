import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const {
    amountPence, name, email, giftAid,
    addressLine1, addressLine2, city, postcode,
  } = await request.json()

  if (!amountPence || amountPence < 100) {
    return Response.json({ error: 'Amount must be at least £1' }, { status: 400 })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: 'gbp',
      payment_method_types: ['card'],
      receipt_email: email || undefined,
      metadata: {
        type: 'donation',
        donor_name: name,
        donor_email: email,
        gift_aid: giftAid ? 'yes' : 'no',
        // Address only populated when claiming Gift Aid
        address_line1: addressLine1 || '',
        address_line2: addressLine2 || '',
        city: city || '',
        postcode: postcode || '',
      },
    })

    return Response.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start the payment'
    return Response.json({ error: message }, { status: 500 })
  }
}
