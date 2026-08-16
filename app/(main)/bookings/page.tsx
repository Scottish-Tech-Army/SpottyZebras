'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { XIcon, TicketIcon, ClockIcon, MapPinIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase'
import { formatEventWhen, priceLabel } from '@/lib/events/format'
import { Patrick_Hand } from 'next/font/google'

interface BookedChild {
  bookingId: string
  childId: string
  name: string
  age: number
}

interface BookedEvent {
  id: string
  title: string
  startsAt: string | null
  endsAt: string | null
  location: string
  price: number
  isPaid: boolean
  children: BookedChild[]
}

interface CancelTarget {
  bookingId: string
  childName: string
  eventTitle: string
}

const brandFont = Patrick_Hand({ weight: '400', subsets: ['latin'] })

export default function BookingsPage() {
  const [events, setEvents] = useState<BookedEvent[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session) throw new Error('no session')
        const res = await fetch('/api/my-bookings', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('request failed')
        const data = await res.json()
        if (alive) setEvents(data.events ?? [])
      } catch {
        if (alive) { setEvents([]); setLoadError(true) }
      }
    }
    load()
    return () => { alive = false }
  }, [])

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelBusy(true)
    setActionError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('no session')
      const res = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: cancelTarget.bookingId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setActionError(data.error ?? 'Could not cancel the booking. Please try again.'); return }

      // Drop the cancelled child; remove the event card if it has no bookings left.
      setEvents(prev =>
        (prev ?? [])
          .map(e =>
            e.children.some(c => c.bookingId === cancelTarget.bookingId)
              ? { ...e, children: e.children.filter(c => c.bookingId !== cancelTarget.bookingId) }
              : e,
          )
          .filter(e => e.children.length > 0),
      )
      setCancelTarget(null)
    } catch {
      setActionError('Something went wrong. Please try again.')
    } finally {
      setCancelBusy(false)
    }
  }

  const loading = events === null

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">My bookings</h1>
        <p className={`${brandFont.className} text-md text-[var(--color-text-muted)]`}>The upcoming events your children are going to. Paid bookings can’t be cancelled online.</p>
      </div>

      {actionError && (
        <p className="mb-4 text-sm text-[var(--color-error)]">{actionError}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16" role="status" aria-label="Loading bookings">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-[var(--color-error)]">Couldn’t load your bookings. Please refresh to try again.</p>
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {events.map(ev => (
            <Card key={ev.id} className="p-4">
              <div className="mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--color-secondary)]">{ev.title}</h2>
                  <PricePill price={ev.price} />
                </div>
                {ev.startsAt && (
                  <div className="mt-1 flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                      {formatEventWhen(ev.startsAt, ev.endsAt)}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                {ev.children.map(c => (
                  <li key={c.bookingId} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 text-sm text-[var(--color-text)]">
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-[var(--color-text-muted)]"> · age {c.age}</span>
                    </span>
                    {ev.isPaid ? null : (
                      <button
                        type="button"
                        aria-label={`Cancel ${c.name}’s booking`}
                        title="Cancel booking"
                        onClick={() => setCancelTarget({ bookingId: c.bookingId, childName: c.name, eventTitle: ev.title })}
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--color-border-input)] p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-sand)]"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel booking?"
        message={
          cancelTarget
            ? `This will cancel ${cancelTarget.childName}’s place at “${cancelTarget.eventTitle}” and free up the spot.`
            : undefined
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        danger
        busy={cancelBusy}
        onConfirm={confirmCancel}
        onCancel={() => { if (!cancelBusy) setCancelTarget(null) }}
      />
    </div>
  )
}

/** Free events get a warm filled chip; paid events an outlined price chip.
 *  Matches the pill on the events calendar cards. */
function PricePill({ price }: { price: number }) {
  if (price > 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--color-border-input)] px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
        {priceLabel(price)}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-text)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-tangerine) 20%, white)' }}
    >
      Free
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-sand)] text-[var(--color-text-muted)]">
        <TicketIcon className="h-7 w-7" />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        You haven’t booked onto any events yet.
      </p>
    </div>
  )
}
