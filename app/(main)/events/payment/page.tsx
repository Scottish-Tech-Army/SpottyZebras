'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChevronLeftIcon, ClockIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const SESSION_KEY = 'sz_event_payment'

interface PaymentSession {
  clientSecret: string
  paymentIntentId: string
  amount: number
  eventId: string
  eventTitle: string
  childIds: string[]
  holdExpiresAt: string | null
}

function CheckoutForm({
  session, onPayStart, onPayError,
}: {
  session: PaymentSession
  onPayStart: () => void
  onPayError: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const spots = session.childIds.length

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!stripe || !elements) return

    setError('')
    setLoading(true)
    onPayStart() // mark "paying" so leaving for the success page doesn't release the hold

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/events/payment/success` },
    })

    // We only get here if confirmation FAILED (success redirects away). Re-arm the
    // release so a subsequent abandon frees the spot.
    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.')
      setLoading(false)
      onPayError()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="surface-sunken rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <strong className="text-[var(--color-text)]">{session.eventTitle}</strong>
        <br />
        {spots} spot{spots === 1 ? '' : 's'} · <strong className="text-[var(--color-text)]">£{session.amount.toFixed(2)}</strong>
      </div>

      <PaymentElement />

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <Button type="submit" size="lg" disabled={!stripe || loading}>
        {loading ? 'Processing…' : `Pay £${session.amount.toFixed(2)}`}
      </Button>
    </form>
  )
}

/** Counts down to the hold deadline; calls onExpire once it reaches zero. */
function HoldTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const secondsLeft = () => Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const [left, setLeft] = useState(secondsLeft)

  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setLeft(s)
      if (s <= 0) { clearInterval(id); onExpire() }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpire])

  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  const low = left <= 60

  return (
    <div
      className="mb-5 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 py-2.5 text-sm"
      style={{
        borderColor: low ? 'var(--color-error)' : 'var(--color-border)',
        color: low ? 'var(--color-error)' : 'var(--color-text-muted)',
      }}
      role="timer"
      aria-live="off"
    >
      <ClockIcon className="h-4 w-4 shrink-0" />
      <span>
        Your spot will be held for <strong className="tabular-nums">{mm}:{ss}</strong> to complete the payment
      </span>
    </div>
  )
}

export default function EventPaymentPage() {
  const router = useRouter()
  const [session, setSession] = useState<PaymentSession | null>(null)
  const [expired, setExpired] = useState(false)
  // "paying" suppresses the release when we're being redirected to the success page.
  const payingRef = useRef(false)
  const releasedRef = useRef(false)
  // Cached so the release can fire synchronously on tab close (no async token read).
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) { router.replace('/events'); return }
    setSession(JSON.parse(raw))
    createClient().auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token ?? null
    })
  }, [router])

  // Free the held spot in the backend (and cancel the unpaid PaymentIntent). Runs
  // at most once. `keepalive` lets it survive a tab close / hard navigation.
  const release = useCallback((keepalive = false) => {
    if (releasedRef.current) return
    releasedRef.current = true
    const raw = sessionStorage.getItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    const token = tokenRef.current
    if (!raw || !token) return
    const s = JSON.parse(raw) as PaymentSession
    try {
      void fetch('/api/event-payment', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: s.eventId, paymentIntentId: s.paymentIntentId }),
        keepalive,
      })
    } catch {
      // Best-effort — the 10-min hold expiry is the backstop.
    }
  }, [])

  // Tab close / refresh / hard navigation. Skipped while paying (the success
  // redirect is a navigation too, and there the booking must be kept).
  useEffect(() => {
    const onHide = () => { if (!payingRef.current) release(true) }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [release])

  // Backstop for any in-app navigation away from this screen (e.g. the nav menu or
  // browser back). It must NOT fire on React Strict Mode's dev mount→unmount→remount
  // (that would release the hold and wipe the session before the page even shows).
  // `armed` flips true on a macrotask after commit; Strict Mode's unmount runs
  // synchronously before that, so its cleanup sees armed=false and skips the release.
  useEffect(() => {
    const armed = { current: false }
    const t = setTimeout(() => { armed.current = true }, 0)
    return () => {
      clearTimeout(t)
      if (armed.current && !payingRef.current) release(true)
    }
  }, [release])

  const leave = useCallback(() => {
    release(false)
    router.push('/events')
  }, [release, router])

  const handleExpire = useCallback(() => {
    if (payingRef.current) return // a payment is mid-flight — let it finish
    release(false)
    setExpired(true)
  }, [release])

  if (!session) return null

  if (expired) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="p-10 w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">Your hold expired</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-8">
            We held the spot for 10 minutes and it’s now been released. Please start again to book.
          </p>
          <Button size="lg" className="w-full" onClick={() => router.push('/events')}>
            Back to events
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-start justify-center py-10 px-4">
      <Card className="p-8 w-full max-w-md">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute left-0">
            <button
              type="button"
              onClick={leave}
              aria-label="Back"
              className="-ml-1 p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-sand)] transition"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Payment</h2>
        </div>

        {session.holdExpiresAt && (
          <HoldTimer expiresAt={session.holdExpiresAt} onExpire={handleExpire} />
        )}

        <Elements
          stripe={stripePromise}
          options={{ clientSecret: session.clientSecret, appearance: { theme: 'stripe' } }}
        >
          <CheckoutForm
            session={session}
            onPayStart={() => { payingRef.current = true }}
            onPayError={() => { payingRef.current = false }}
          />
        </Elements>

        <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
          Secured by <strong>Stripe</strong>. We never see or store your card details.
        </p>
      </Card>
    </div>
  )
}
