'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import BackButton from '@/components/BackButton'
import { Card } from '@/components/ui/Card'
import { ClockIcon, MapPinIcon, ImageIcon, TriangleAlertIcon } from '@/components/icons'
import EventRsvpDialog, { type RsvpChild } from '@/components/events/EventRsvpDialog'
import { useAppChrome } from '@/components/AppUserContext'
import { createClient } from '@/lib/supabase'
import type { EventItem } from '@/lib/events/types'
import { ageLabel, formatEventWhen, priceLabel, spotsLabel } from '@/lib/events/format'

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { role } = useAppChrome()
  const isParent = role === 'parent'

  const [event, setEvent] = useState<EventItem | null>(null)
  const [loadError, setLoadError] = useState<'notfound' | 'error' | null>(null)

  // Parent-only: children + which of them are already booked on THIS event (for the dialog).
  const [kids, setKids] = useState<RsvpChild[] | null>(null)
  const [kidsError, setKidsError] = useState(false)
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set())
  const [rsvpOpen, setRsvpOpen] = useState(false)

  // Load the event. Reusable so we can refresh spots after a booking.
  const loadEvent = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession()
    if (!session) { setLoadError('error'); return }
    const res = await fetch(`/api/events/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.status === 404) { setLoadError('notfound'); return }
    if (!res.ok) { setLoadError('error'); return }
    const data = await res.json()
    setEvent(data.event)
  }, [id])

  useEffect(() => {
    let alive = true
    loadEvent().catch(() => { if (alive) setLoadError('error') })
    return () => { alive = false }
  }, [loadEvent])

  // Parent's children + existing bookings, so the RSVP dialog opens instantly.
  useEffect(() => {
    if (!isParent) return
    let alive = true
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session) throw new Error('no session')
        const auth = { Authorization: `Bearer ${session.access_token}` }
        const [childRes, bookingRes] = await Promise.all([
          fetch('/api/children', { headers: auth }),
          fetch('/api/bookings', { headers: auth }),
        ])
        if (!childRes.ok) throw new Error('children request failed')
        const childData = await childRes.json()
        if (alive) setKids(childData.children ?? [])

        // Best-effort — if bookings fail we just don't show "Going".
        if (bookingRes.ok) {
          const { bookings: rows } = await bookingRes.json()
          const set = new Set<string>()
          for (const b of rows ?? []) if (b.eventId === id) set.add(b.childId)
          if (alive) setBookedIds(set)
        }
      } catch {
        if (alive) { setKids([]); setKidsError(true) }
      }
    }
    load()
    return () => { alive = false }
  }, [isParent, id])

  // Fold a completed free booking in (mark "Going") and refresh the spots tag.
  function handleBooked(childIds: string[]) {
    setBookedIds(prev => {
      const next = new Set(prev)
      childIds.forEach(cid => next.add(cid))
      return next
    })
    void loadEvent()
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-10">
      <div className="mb-6 flex items-center gap-2">
        <BackButton href="/events" />
        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">{event ? event.title : 'Event'}</h1>
      </div>

      {!event ? (
        loadError === 'notfound' ? (
          <p className="text-sm text-[var(--color-text-muted)]">This event could not be found. It may have been removed.</p>
        ) : loadError === 'error' ? (
          <p className="text-sm text-[var(--color-error)]">Couldn’t load this event. Please refresh to try again.</p>
        ) : (
          <div className="flex items-center justify-center py-16" role="status" aria-label="Loading event">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        )
      ) : (
        <EventDetails
          event={event}
          canBook={isParent}
          onBookClick={() => setRsvpOpen(true)}
        />
      )}

      {rsvpOpen && event && (
        <EventRsvpDialog
          key={event.id}
          event={event}
          kids={kids}
          bookedIds={bookedIds}
          loading={kids === null && !kidsError}
          error={kidsError}
          onBooked={handleBooked}
          onClose={() => setRsvpOpen(false)}
        />
      )}
    </div>
  )
}

function EventDetails({
  event, canBook, onBookClick,
}: {
  event: EventItem
  canBook: boolean
  onBookClick: () => void
}) {
  const full = event.spotsLeft != null && event.spotsLeft <= 0

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        {/* Image — full width on mobile portrait, ~70% (centered) from sm up */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-sand)] sm:mx-auto sm:w-[70%]">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
              {formatEventWhen(event.startsAt, event.endsAt)}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--color-border-input)] px-3 py-1 text-sm font-semibold text-[var(--color-text)]">
            {ageLabel(event.ageMin, event.ageMax)}
          </span>
          <PricePill price={event.price} />
          {event.spotsLeft != null && <SpotsTag spotsLeft={event.spotsLeft} />}
        </div>

        {/* Full description — preserves the admin's line breaks / paragraphs. */}
        {event.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {event.description}
          </p>
        )}

        {canBook && event.price > 0 && (
          <p className="surface-sunken flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
            <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-tomato)]" />
            <span>Paid events are non-cancellable and non-refundable once booked.</span>
          </p>
        )}

        {canBook && (
          <button
            type="button"
            onClick={onBookClick}
            disabled={full}
            className="btn-primary self-center rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50"
          >
            {full ? 'Fully booked' : event.price > 0 ? 'Pay to book for your spot' : 'Book your spot!'}
          </button>
        )}
      </div>
    </Card>
  )
}

/** Availability: a blue "N spots left" chip, or a muted "Fully booked" one. */
function SpotsTag({ spotsLeft }: { spotsLeft: number }) {
  if (spotsLeft <= 0) {
    return (
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-[var(--color-text-muted)]"
        style={{ backgroundColor: 'var(--color-sand)' }}
      >
        Fully booked
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-[var(--color-secondary)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 14%, white)' }}
    >
      {spotsLabel(spotsLeft)}
    </span>
  )
}

/** Free events get a warm filled chip; paid events an outlined price chip. */
function PricePill({ price }: { price: number }) {
  if (price > 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--color-border-input)] px-3 py-1 text-sm font-semibold text-[var(--color-text)]">
        {priceLabel(price)}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-[var(--color-text)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-tangerine) 20%, white)' }}
    >
      Free
    </span>
  )
}
