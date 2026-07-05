'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentSession {
  clientSecret: string
  amount: number
  frequency: string
  name: string
  email: string
}

function CheckoutForm({ amount, frequency }: { amount: number; frequency: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!stripe || !elements) return

    setError('')
    setLoading(true)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/donate/success` },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="surface-sunken rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        Paying <strong className="text-[var(--color-text)]">£{amount.toFixed(2)}</strong>
        {frequency === 'monthly' ? ' per month' : ' one-off'}
      </div>

      <PaymentElement />

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <Button type="submit" size="lg" disabled={!stripe || loading}>
        {loading ? 'Processing…' : `Donate £${amount.toFixed(2)}`}
      </Button>
    </form>
  )
}

export default function PaymentPage() {
  const router = useRouter()
  const [session, setSession] = useState<PaymentSession | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('sz_payment')
    if (!raw) { router.replace('/donate'); return }
    setSession(JSON.parse(raw))
  }, [router])

  if (!session) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <Card className="p-8 w-full max-w-md">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute left-0">
              <BackButton />
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">Payment</h2>
          </div>

          <Elements
            stripe={stripePromise}
            options={{ clientSecret: session.clientSecret, appearance: { theme: 'stripe' } }}
          >
            <CheckoutForm amount={session.amount} frequency={session.frequency} />
          </Elements>

          <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
            Secured by <strong>Stripe</strong>. We never see or store your card details.
          </p>
        </Card>
      </div>
    </div>
  )
}
