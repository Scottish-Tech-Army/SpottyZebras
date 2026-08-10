'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ChevronLeftIcon, ChevronRightIcon, TodayIcon, XIcon } from '@/components/icons'
import { EventCard } from '@/components/events/EventCard'
import EventRsvpDialog, { type RsvpChild } from '@/components/events/EventRsvpDialog'
import { useAppChrome } from '@/components/AppUserContext'
import { createClient } from '@/lib/supabase'
import type { EventItem } from '@/lib/events/types'
import { formatDayLabelLocal, formatWeekRange } from '@/lib/events/format'
import {
  addDays, addMonths, endOfMonth, isBeforeDay, isSameDay, londonDateKey, monthLabel,
  monthLabelShort, monthMatrix, startOfMonth, startOfWeek, weekDays, ymd,
} from '@/lib/events/date'

type View = 'week' | 'month'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Stable empty set for events with no bookings (avoids a new Set() each render).
const EMPTY_IDS: ReadonlySet<string> = new Set()

/**
 * The events-screen calendar. Two views (week / month) that expand in the same
 * place; today is highlighted, days before today can't be selected, and days
 * that have events carry a dot. Events are mocked for now.
 */
export default function EventCalendar() {
  const { role } = useAppChrome()
  const isParent = role === 'parent'

  // `today` is fixed for the life of the screen so comparisons stay stable.
  const today = useMemo(() => new Date(), [])

  // Events come from the API (today → next 6 months). `null` means still loading.
  const [events, setEvents] = useState<EventItem[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  // The parent's children (for the RSVP dialog) and the event being RSVP'd to.
  const [kids, setKids] = useState<RsvpChild[] | null>(null)
  const [kidsError, setKidsError] = useState(false)
  const [rsvpEvent, setRsvpEvent] = useState<EventItem | null>(null)
  // Which children are already booked, keyed by event id → set of child ids.
  const [bookings, setBookings] = useState<Map<string, Set<string>>>(new Map())

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session) throw new Error('no session')
        const res = await fetch('/api/events', {
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

  // Load the parent's children + existing bookings once, so the RSVP dialog
  // opens instantly and can show who's already going.
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

        // Bookings are best-effort — if they fail we just don't show "Going".
        if (bookingRes.ok) {
          const { bookings: rows } = await bookingRes.json()
          const map = new Map<string, Set<string>>()
          for (const b of rows ?? []) {
            if (!map.has(b.eventId)) map.set(b.eventId, new Set())
            map.get(b.eventId)!.add(b.childId)
          }
          if (alive) setBookings(map)
        }
      } catch {
        if (alive) { setKids([]); setKidsError(true) }
      }
    }
    load()
    return () => { alive = false }
  }, [isParent])

  // Refetch events but merge ONLY spotsLeft into the current cards — the tag
  // updates to the server truth without re-rendering images (no flicker).
  async function refreshSpots() {
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) return
      const res = await fetch('/api/events', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const fresh = new Map<string, number | null>()
      for (const e of data.events ?? []) fresh.set(e.id, e.spotsLeft)
      setEvents(prev =>
        (prev ?? []).map(e => (fresh.has(e.id) ? { ...e, spotsLeft: fresh.get(e.id) ?? null } : e)),
      )
    } catch {
      // Best-effort — the tag just stays as it was until the next load.
    }
  }

  // Fold a just-completed RSVP into the booking map (for "Going") and refresh the
  // spots-left tags from the server.
  function handleBooked(eventId: string, childIds: string[]) {
    setBookings(prev => {
      const next = new Map(prev)
      const set = new Set(next.get(eventId) ?? [])
      childIds.forEach(id => set.add(id))
      next.set(eventId, set)
      return next
    })
    void refreshSpots()
  }

  const loading = events === null

  const [view, setView] = useState<View>('week')
  // One cursor drives the displayed period: its week in week view, its month in
  // month view. A single source means the grid and the (unfiltered) list can
  // never drift apart when you page around.
  const [cursor, setCursor] = useState<Date>(today)
  // A day filter layered on top. While set, it takes preference: paging moves
  // the grid but the list stays pinned to this day until it's cleared.
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Days (UK-local) that have at least one upcoming event → dot indicator. Past
  // days never carry a dot — the API only ever returns events from today on.
  const eventDays = useMemo(() => {
    const todayKey = ymd(today)
    return new Set((events ?? []).map(e => londonDateKey(e.startsAt)).filter(key => key >= todayKey))
  }, [events, today])

  function step(dir: -1 | 1) {
    setCursor(c => (view === 'month' ? addMonths(c, dir) : addDays(c, dir * 7)))
  }

  function changeView(next: View) {
    setView(next)
    // Month paging normalises the cursor to the 1st, so the current month's
    // cursor can point at a past week. Switching to week view then shows that
    // dead first week — snap forward to today's week instead.
    if (next === 'week') setCursor(c => (isBeforeDay(c, today) ? today : c))
  }

  function goToday() {
    setSelectedDay(null)
    setCursor(today)
  }

  function toggleDay(date: Date) {
    if (selectedDay && isSameDay(selectedDay, date)) {
      setSelectedDay(null)
    } else {
      setSelectedDay(date)
      setCursor(date) // keep the grid centred on the day just picked
    }
  }

  const rows = view === 'month' ? monthMatrix(cursor) : [weekDays(cursor)]

  // The list shows: the selected day if there is one; otherwise the period the
  // current view is displaying — the cursor's week, or its whole month.
  const weekStart = startOfWeek(cursor)
  const weekEnd = addDays(weekStart, 6)
  let listFrom: Date, listTo: Date
  if (selectedDay) {
    listFrom = listTo = selectedDay
  } else if (view === 'week') {
    listFrom = weekStart
    listTo = weekEnd
  } else {
    listFrom = startOfMonth(cursor)
    listTo = endOfMonth(cursor)
  }
  // The list only ever shows upcoming events, so never start before today —
  // this trims the already-past days from the current week / month.
  const todayKey = ymd(today)
  const listFromKey = ymd(listFrom)
  const fromKey = listFromKey > todayKey ? listFromKey : todayKey // ISO keys sort lexically
  const toKey = ymd(listTo)
  const listEvents = (events ?? [])
    .filter(e => {
      const key = londonDateKey(e.startsAt)
      return key >= fromKey && key <= toKey
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today))
  const isCurrentMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()
  const listHeading = selectedDay
    ? formatDayLabelLocal(selectedDay)
    : view === 'week'
      ? isCurrentWeek ? 'This week' : formatWeekRange(weekStart, weekEnd)
      : isCurrentMonth ? 'This month' : monthLabel(cursor)
  const emptyMessage = selectedDay
    ? 'No events on this day.'
    : view === 'week' ? 'No events this week.' : 'No events this month.'

  // Navigation is bounded: no earlier than the current week/month, and no more
  // than 6 months ahead. Past-side limits differ by design — the month "prev"
  // is hidden (nothing before this month), the week "prev" is only disabled.
  // Strict 6-month window: the current month plus the next 5 are reachable.
  const horizonMonth = addMonths(startOfMonth(today), 5)   // last month reachable
  const atMinWeek = !isBeforeDay(startOfWeek(today), weekStart)   // showing current week
  const atMinMonth = startOfMonth(cursor).getTime() <= startOfMonth(today).getTime()
  const atMaxWeek = !isBeforeDay(weekStart, startOfWeek(endOfMonth(horizonMonth)))
  const atMaxMonth = startOfMonth(cursor).getTime() >= horizonMonth.getTime()

  const prevHidden = view === 'month' && atMinMonth
  const prevDisabled = view === 'week' && atMinWeek
  const nextHidden = view === 'month' ? atMaxMonth : atMaxWeek

  // The "Today" shortcut only appears once the grid has moved off the current
  // week / month — mirroring how "Clear date" appears only when a day is picked.
  const offCurrentPeriod = view === 'week' ? !atMinWeek : !atMinMonth

  return (
    <div className="flex flex-col gap-6">
      <Card className="@container p-4 sm:p-5">
        {/* Month/year · (Today) · view toggle. Wraps to a second line only if a
            device is too narrow even after the compact form kicks in. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <div className="flex items-center gap-1">
            <NavButton label="Previous" onClick={() => step(-1)} hidden={prevHidden} disabled={prevDisabled}>
              <ChevronLeftIcon className="w-5 h-5" />
            </NavButton>
            <h2 className="text-center text-base font-bold text-[var(--color-text)] @lg:min-w-[8.5rem] @lg:text-lg">
              <span className="@lg:hidden">{monthLabelShort(cursor)}</span>
              <span className="hidden @lg:inline">{monthLabel(cursor)}</span>
            </h2>
            <NavButton label="Next" onClick={() => step(1)} hidden={nextHidden}>
              <ChevronRightIcon className="w-5 h-5" />
            </NavButton>
          </div>

          {offCurrentPeriod && (
            <PillButton label="Today" icon={<TodayIcon className="h-4 w-4" />} onClick={goToday}>
              <span className="hidden @lg:inline">Today</span>
            </PillButton>
          )}

          <div className="seg-group inline-flex rounded-full p-1">
            <ToggleButton active={view === 'week'} onClick={() => changeView('week')}>Week</ToggleButton>
            <ToggleButton active={view === 'month'} onClick={() => changeView('month')}>Month</ToggleButton>
          </div>
        </div>

        {/* Weekday header */}
        <div className="mt-4 grid grid-cols-7">
          {WEEKDAY_LABELS.map((d, i) => (
            <div key={i} className="pb-1 text-center text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="flex flex-col">
          {rows.map((week, ri) => (
            <div key={ri} className="grid grid-cols-7">
              {week.map((date, ci) =>
                date ? (
                  <DayCell
                    key={ci}
                    date={date}
                    isToday={isSameDay(date, today)}
                    isSelected={!!selectedDay && isSameDay(date, selectedDay)}
                    isDisabled={isBeforeDay(date, today)}
                    hasEvent={eventDays.has(ymd(date))}
                    onSelect={() => toggleDay(date)}
                  />
                ) : (
                  <div key={ci} />
                )
              )}
            </div>
          ))}
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--color-text)]">{listHeading}</h3>
          {selectedDay && (
            <PillButton label="Clear date" icon={<XIcon className="h-4 w-4" />} onClick={() => setSelectedDay(null)}>
              Clear date
            </PillButton>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16" role="status" aria-label="Loading events">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-[var(--color-error)]">Couldn’t load events. Please refresh to try again.</p>
        ) : listEvents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {listEvents.map(e => (
              <EventCard key={e.id} event={e} onSelect={isParent ? () => setRsvpEvent(e) : undefined} />
            ))}
          </div>
        )}
      </section>

      {rsvpEvent && (
        <EventRsvpDialog
          key={rsvpEvent.id}
          event={rsvpEvent}
          kids={kids}
          bookedIds={bookings.get(rsvpEvent.id) ?? EMPTY_IDS}
          loading={kids === null && !kidsError}
          error={kidsError}
          onBooked={childIds => handleBooked(rsvpEvent.id, childIds)}
          onClose={() => setRsvpEvent(null)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function NavButton({
  label, onClick, children, hidden = false, disabled = false,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  hidden?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      // `invisible` keeps the slot's width so the label stays centred.
      className={`p-1.5 rounded-full text-[var(--color-text-muted)] transition ${
        hidden ? 'invisible' : ''
      } ${disabled ? 'cursor-default opacity-30' : 'hover:bg-[var(--color-sand)] hover:text-[var(--color-text)]'}`}
    >
      {children}
    </button>
  )
}

/** Shared icon+text pill for the calendar's actions (Today, Clear date). */
function PillButton({ label, icon, onClick, children }: {
  label: string        // accessible name — the visible text can be hidden on narrow screens
  icon: React.ReactNode
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-sand)]"
    >
      {icon}
      {children}
    </button>
  )
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1.5 text-sm font-semibold transition @lg:px-4 ${active ? 'seg-active' : 'seg-idle'}`}
    >
      {children}
    </button>
  )
}

function DayCell({
  date, isToday, isSelected, isDisabled, hasEvent, onSelect,
}: {
  date: Date
  isToday: boolean
  isSelected: boolean
  isDisabled: boolean
  hasEvent: boolean
  onSelect: () => void
}) {
  // The number "pill". A selected day fills; today (when unselected) is outlined.
  let pill = 'text-[var(--color-text)]'
  if (isDisabled) pill = 'text-[var(--color-text-muted)] opacity-40'
  else if (isSelected) pill = 'text-white'
  else if (isToday) pill = 'text-[var(--color-primary)]'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={date.toDateString()}
      className={`group flex flex-col items-center gap-1 py-1.5 ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-sm font-semibold transition ${pill} ${
          isSelected ? '' : isToday ? 'border-2 border-[var(--color-primary)]' : ''
        } ${!isDisabled && !isSelected ? 'group-hover:bg-[var(--color-sand)]' : ''}`}
        style={isSelected ? { backgroundColor: 'var(--color-primary)' } : undefined}
      >
        {date.getDate()}
      </span>
      {/* Event dot — reserves its own height so numbers stay aligned. */}
      <span
        className={`h-1.5 w-1.5 rounded-full ${hasEvent ? '' : 'opacity-0'}`}
        style={{ backgroundColor: 'var(--color-accent-tangerine)' }}
      />
    </button>
  )
}
