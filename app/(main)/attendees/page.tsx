'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { UsersIcon, CheckIcon, XIcon } from '@/components/icons'
import { useAppChrome } from '@/components/AppUserContext'
import { createClient } from '@/lib/supabase'
import { formatDayLabel, formatTime } from '@/lib/events/format'

interface PickerEvent {
  id: string
  title: string
  startsAt: string | null
  endsAt: string | null
}

interface Attendee {
  childId: string
  name: string
  age: number
  supportNeeds: string
  allergies: string
  photoConsent: boolean
}

/** "Messy art afternoon — Sat 15 Aug, 11:00 am" for the picker. */
function optionLabel(e: PickerEvent): string {
  if (!e.startsAt) return e.title
  return `${e.title} - ${formatDayLabel(e.startsAt)}, ${formatTime(e.startsAt)}`
}

async function authHeader(): Promise<Record<string, string> | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : null
}

export default function AttendeesPage() {
  const router = useRouter()
  const { role } = useAppChrome()

  // Parents shouldn't reach this screen; the API enforces it too.
  useEffect(() => {
    if (role && role !== 'admin') router.replace('/events')
  }, [role, router])

  const [events, setEvents] = useState<PickerEvent[] | null>(null)
  const [eventsError, setEventsError] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const [attendees, setAttendees] = useState<Attendee[] | null>(null)
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const [attendeesError, setAttendeesError] = useState(false)

  // Load the events list for the picker.
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const headers = await authHeader()
        if (!headers) throw new Error('no session')
        const res = await fetch('/api/attendees', { headers })
        if (!res.ok) throw new Error('request failed')
        const data = await res.json()
        if (alive) setEvents(data.events ?? [])
      } catch {
        if (alive) { setEvents([]); setEventsError(true) }
      }
    }
    load()
    return () => { alive = false }
  }, [])

  // Load attendees whenever the selected event changes.
  useEffect(() => {
    // Nothing selected → the render already shows nothing; no state to touch.
    if (!selectedId) return
    let alive = true
    async function load() {
      setAttendeesLoading(true)
      setAttendeesError(false)
      try {
        const headers = await authHeader()
        if (!headers) throw new Error('no session')
        const res = await fetch(`/api/attendees?eventId=${encodeURIComponent(selectedId)}`, { headers })
        if (!res.ok) throw new Error('request failed')
        const data = await res.json()
        if (alive) setAttendees(data.attendees ?? [])
      } catch {
        if (alive) { setAttendees([]); setAttendeesError(true) }
      } finally {
        if (alive) setAttendeesLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [selectedId])

  const eventsLoading = events === null

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Attendees</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Pick an event to see who’s coming.</p>
      </div>

      {/* Event picker */}
      <div className="mb-6">
        <select
          id="event-picker"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          disabled={eventsLoading || eventsError || (events?.length ?? 0) === 0}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-60"
        >
          <option value="">
            {eventsLoading ? 'Loading events…' : eventsError ? 'Couldn’t load events' : (events?.length ?? 0) === 0 ? 'No events yet' : 'Select an event…'}
          </option>
          {(events ?? []).map(e => (
            <option key={e.id} value={e.id}>{optionLabel(e)}</option>
          ))}
        </select>
      </div>

      {/* Attendees */}
      {!selectedId ? null : attendeesLoading ? (
        <div className="flex items-center justify-center py-16" role="status" aria-label="Loading attendees">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      ) : attendeesError ? (
        <p className="text-sm text-[var(--color-error)]">Couldn’t load attendees. Please try again.</p>
      ) : (attendees?.length ?? 0) === 0 ? (
        <EmptyAttendees />
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">
            {attendees!.length} {attendees!.length === 1 ? 'child' : 'children'} attending
          </p>
          <div className="flex flex-col gap-2">
            {attendees!.map(a => (
              <Card key={a.childId} className="p-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-sm font-bold text-[var(--color-text)]">{a.name}</h3>
                  <span className="text-xs text-[var(--color-text-muted)]">age {a.age}</span>
                  <span className="ml-auto"><PhotoConsentPill ok={a.photoConsent} /></span>
                </div>
                <dl className="mt-1.5 flex flex-col gap-0.5">
                  <DetailRow label="Support needs" value={a.supportNeeds} />
                  <DetailRow label="Allergies" value={a.allergies} />
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** At-a-glance photo permission — green tick when consented, red cross when not. */
function PhotoConsentPill({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, white)' }}
      >
        <CheckIcon className="h-3.5 w-3.5" />
        Photo consent
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--color-error)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, white)' }}
    >
      <XIcon className="h-3.5 w-3.5" />
      No photos
    </span>
  )
}

/** One compact attendee detail: a muted label column with the value beside it, so
 *  the two stay distinct while keeping each row to a single line. */
function DetailRow({ label, value }: { label: string; value: string }) {
  const has = value.trim() !== ''
  return (
    <div className="flex items-baseline gap-2 text-sm leading-snug">
      <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt>
      <dd className={`min-w-0 ${has ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
        {has ? value : '—'}
      </dd>
    </div>
  )
}

function EmptyAttendees() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-sand)] text-[var(--color-text-muted)]">
        <UsersIcon className="h-7 w-7" />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">No bookings for this event yet.</p>
    </div>
  )
}
