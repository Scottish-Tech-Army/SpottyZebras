'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const SESSION_KEY = 'sz_event_payment'

interface PaymentSession {
  clientSecret: string
  amount: number
  eventId: string
  eventTitle: string
  childIds: string[]
}

type Status = 'loading' | 'succeeded' | 'failed'

export default function EventPaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SuccessContent />
    </Suspense>
  )
}

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [session, setSession] = useState<PaymentSession | null>(null)
  // Run once. Strict Mode double-invokes effects in dev, and we clear the session
  // on success — the guard stops the second run bouncing to /events too early.
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) { router.replace('/events'); return }
    setSession(JSON.parse(raw))

    const redirectStatus = searchParams.get('redirect_status')
    if (redirectStatus === 'succeeded') {
      setStatus('succeeded')
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      // Any non-success redirect_status (or none) means the card didn't go through.
      setStatus('failed')
    }
  }, [router, searchParams])

  if (status === 'loading' || !session) return null

  const succeeded = status === 'succeeded'
  const spots = session.childIds.length

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10">
      <Card className="p-10 w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-success-icon-bg)]">
          <span className="text-3xl">{succeeded ? '🎉' : '😔'}</span>
        </div>

        <h1 className="text-3xl font-bold text-[var(--color-text)] mb-3">
          {succeeded ? 'You’re all booked in!' : 'Payment failed'}
        </h1>

        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-8">
          {succeeded ? (
            <>
              {spots} spot{spots === 1 ? '' : 's'} for{' '}
              <strong className="text-[var(--color-text-secondary)]">{session.eventTitle}</strong>{' '}
              {spots === 1 ? 'is' : 'are'} confirmed. A receipt is on its way to your email.
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
          <Button
            size="lg"
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY)
              router.push('/events')
            }}
          >
            {succeeded ? 'Back to events' : 'Try again'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
