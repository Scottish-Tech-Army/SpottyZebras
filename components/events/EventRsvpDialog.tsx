'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CheckIcon } from '@/components/icons'
import { isAgeEligible } from '@/lib/events/eligibility'
import { formatDayLabel } from '@/lib/events/format'
import type { EventItem } from '@/lib/events/types'

export interface RsvpChild {
  id: string
  name: string
  age: number
}

/** "£8" / "£8.50" for a whole pounds total. */
function formatPounds(n: number): string {
  return `£${Number.isInteger(n) ? n : n.toFixed(2)}`
}

/**
 * Tapping an event opens this: the parent's children (name + age), each with a
 * checkbox. Only children inside the event's age range can be selected. Free
 * events show "RSVP"; paid events show "Pay £X & RSVP". On confirm we POST the
 * selected children to /api/bookings (which re-checks ownership, price, age).
 *
 * Paid events don't book here — they create a PaymentIntent via /api/event-payment
 * and hand off to the /events/payment card screen; the booking is written by the
 * Stripe webhook once the payment settles.
 */
export default function EventRsvpDialog({
  event, kids, bookedIds, loading, error, onBooked, onClose,
}: {
  event: EventItem
  kids: RsvpChild[] | null
  bookedIds: ReadonlySet<string>
  loading: boolean
  error: boolean
  onBooked: (childIds: string[]) => void
  onClose: () => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isPaid = event.price > 0
  const total = event.price * selected.size
  const primaryLabel = submitting
    ? 'Saving…'
    : isPaid
      ? `Pay ${formatPounds(total)} & book your spot!`
      : 'Book your spot!'

  // Availability guard (the server enforces this too).
  const spotsLeft = event.spotsLeft
  const overCapacity = spotsLeft != null && selected.size > spotsLeft
  const capacityNote =
    spotsLeft != null && spotsLeft <= 0
      ? 'This event is full.'
      : overCapacity
        ? `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left.`
        : null

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit() {
    if (selected.size === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('no session')
      const headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      const childIds = [...selected]

      // Paid events: create the PaymentIntent and hand off to the card screen.
      // The booking is written by the webhook once payment settles.
      if (isPaid) {
        const res = await fetch('/api/event-payment', {
          method: 'POST', headers, body: JSON.stringify({ eventId: event.id, childIds }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setSubmitError(data.error ?? 'Could not start the payment. Please try again.'); setSubmitting(false); return }
        sessionStorage.setItem('sz_event_payment', JSON.stringify({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
          amount: data.amount,
          eventId: event.id,
          eventTitle: event.title,
          childIds: data.childIds ?? childIds,
          holdExpiresAt: data.holdExpiresAt,
        }))
        router.push('/events/payment') // stay in the submitting state while we navigate
        return
      }

      // Free events: book directly.
      const res = await fetch('/api/bookings', {
        method: 'POST', headers, body: JSON.stringify({ eventId: event.id, childIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSubmitError(data.error ?? 'Could not complete the booking. Please try again.'); setSubmitting(false); return }
      onBooked(childIds) // tell the calendar so these show "Going" next time
      setDone(true)
      setSubmitting(false)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} />

      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold text-[var(--color-text)]">{event.title}</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{formatDayLabel(event.startsAt)}</p>
        </div>

        {done ? (
          <SuccessView onClose={onClose} />
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-6">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                </div>
              ) : error ? (
                <p className="py-6 text-sm text-[var(--color-error)]">Couldn’t load your children. Please try again.</p>
              ) : (kids ?? []).length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-text-muted)]">There are no children on your account.</p>
              ) : (
                (kids ?? []).map(c => {
                  const booked = bookedIds.has(c.id)
                  const eligible = isAgeEligible(c.age, event.ageMin, event.ageMax)
                  const checked = selected.has(c.id)

                  // Already going: grey the row out and mark it with a blue badge.
                  if (booked) {
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-sand)] p-3"
                      >
                        <span
                          aria-hidden
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-input)] bg-white text-[var(--color-text-muted)]"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </span>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-input)] text-sm font-bold text-[var(--color-text-muted)]">
                          {c.name.trim().charAt(0).toUpperCase() || '?'}
                        </span>
                        <span className="min-w-0 text-sm text-[var(--color-text-muted)]">
                          <span className="font-semibold">{c.name}</span>
                          <span> · age {c.age}</span>
                        </span>
                        <span
                          className="ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: 'var(--color-secondary)' }}
                        >
                          Going
                        </span>
                      </div>
                    )
                  }

                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 rounded-[var(--radius-md)] border p-3 transition ${
                        eligible ? 'cursor-pointer' : 'cursor-default opacity-50'
                      } ${
                        checked
                          ? 'border-[var(--color-primary)] bg-[var(--color-success-icon-bg)]'
                          : 'border-[var(--color-border)]'
                      } ${eligible && !checked ? 'hover:bg-[var(--color-sand)]' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={checked}
                        disabled={!eligible}
                        onChange={() => toggle(c.id)}
                      />
                      {/* Custom checkbox so it matches the design and stays keyboard-accessible. */}
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-focus)] ${
                          checked ? 'border-transparent text-white' : 'border-[var(--color-border-input)] bg-white text-transparent'
                        }`}
                        style={checked ? { backgroundColor: 'var(--color-primary)' } : undefined}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      {/* Initial avatar */}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-input)] text-sm font-bold text-[var(--color-text)]">
                        {c.name.trim().charAt(0).toUpperCase() || '?'}
                      </span>
                      <span className="min-w-0 text-sm">
                        <span className="font-semibold text-[var(--color-text)]">{c.name}</span>
                        <span className="text-[var(--color-text-muted)]"> · age {c.age}</span>
                      </span>
                    </label>
                  )
                })
              )}
            </div>

            <div className="flex flex-col gap-3 p-6 pt-4">
              {capacityNote && <p className="text-sm text-[var(--color-text-muted)]">{capacityNote}</p>}
              {submitError && <p className="text-sm text-[var(--color-error)]">{submitError}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={submitting || selected.size === 0 || overCapacity}
                className="btn-primary w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50"
              >
                {primaryLabel}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-input)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-sand)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-2 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-[var(--color-primary)]"
        style={{ backgroundColor: 'var(--color-success-icon-bg)' }}
      >
        ✓
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">You’re all booked in — see you there!</p>
      <button
        type="button"
        onClick={onClose}
        className="btn-primary mt-2 w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold"
      >
        Done
      </button>
    </div>
  )
}
