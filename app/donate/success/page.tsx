'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import Header from '@/components/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDonation } from '@/hooks/useDonation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentSession {
  clientSecret: string
  amount: number
  frequency: string
  name: string
  email: string
}

type Status = 'loading' | 'succeeded' | 'failed'

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { reset } = useDonation()
  const [status, setStatus] = useState<Status>('loading')
  const [session, setSession] = useState<PaymentSession | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('sz_payment')
    if (!raw) { router.replace('/donate'); return }

    const parsed: PaymentSession = JSON.parse(raw)
    setSession(parsed)

    const redirectStatus = searchParams.get('redirect_status')

    if (redirectStatus === 'succeeded') {
      setStatus('succeeded')
      sessionStorage.removeItem('sz_payment')
      return
    }

    if (redirectStatus) {
      setStatus('failed')
      return
    }

    stripePromise.then(async stripe => {
      if (!stripe) { setStatus('failed'); return }
      const { paymentIntent } = await stripe.retrievePaymentIntent(parsed.clientSecret)
      setStatus(paymentIntent?.status === 'succeeded' ? 'succeeded' : 'failed')
      if (paymentIntent?.status === 'succeeded') sessionStorage.removeItem('sz_payment')
    })
  }, [router, searchParams])

  if (status === 'loading' || !session) return null

  const firstName = session.name.trim().split(' ')[0]
  const succeeded = status === 'succeeded'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="p-10 w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-success-icon-bg)]">
            <span className="text-3xl">{succeeded ? '🖤' : '😔'}</span>
          </div>

          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-3">
            {succeeded ? `Thank you, ${firstName}!` : 'Payment failed'}
          </h1>

          <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-8">
            {succeeded ? (
              <>
                Your <strong className="text-[var(--color-text-secondary)]">£{session.amount.toFixed(2)}</strong>{' '}
                {session.frequency === 'monthly' ? 'monthly' : 'one-off'} donation went through.
                <br />
                A receipt is on its way to <strong className="text-[var(--color-text-secondary)]">{session.email}</strong>.
              </>
            ) : (
              <>
                Something went wrong and your payment didn&apos;t go through.
                <br />
                No money has been taken. Please try again.
              </>
            )}
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/" className="w-full">
              <Button size="lg" className="w-full">Back to dashboard</Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                sessionStorage.removeItem('sz_payment')
                // Fresh form after a completed donation; keep details on failure so
                // the donor can retry without re-typing everything.
                if (succeeded) reset()
                router.push('/donate')
              }}
            >
              {succeeded ? 'Donate again' : 'Try again'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
