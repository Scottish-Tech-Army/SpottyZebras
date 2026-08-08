'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { EventCard } from '@/components/events/EventCard'
import { getMockEvents } from '@/lib/events/mockEvents'
import {
  addDays, addMonths, isBeforeDay, isSameDay, londonDateKey, monthLabel, monthMatrix,
  startOfMonth, startOfWeek, weekDays, ymd,
} from '@/lib/events/date'

type View = 'week' | 'month'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * The events-screen calendar. Two views (week / month) that expand in the same
 * place; today is highlighted, days before today can't be selected, and days
 * that have events carry a dot. Events are mocked for now.
 */
export default function EventCalendar() {
  // `today` is fixed for the life of the screen so comparisons stay stable.
  const today = useMemo(() => new Date(), [])
  const events = useMemo(() => getMockEvents(today), [today])

  const [view, setView] = useState<View>('week')
  const [cursor, setCursor] = useState<Date>(today) // any day in the shown week / month
  const [selected, setSelected] = useState<Date>(today)

  // Days (UK-local) that have at least one event → dot indicator.
  const eventDays = useMemo(() => new Set(events.map(e => londonDateKey(e.startsAt))), [events])

  function switchView(next: View) {
    if (next === view) return
    // Keep the selected day in view when expanding / collapsing.
    setCursor(next === 'month' ? startOfMonth(selected) : selected)
    setView(next)
  }

  function step(dir: -1 | 1) {
    setCursor(c => (view === 'month' ? addMonths(c, dir) : addDays(c, dir * 7)))
  }

  const rows = view === 'month' ? monthMatrix(cursor) : [weekDays(cursor)]

  // Events for the week containing the selected day, earliest first.
  const weekStartKey = ymd(startOfWeek(selected))
  const weekEndKey = ymd(addDays(startOfWeek(selected), 6))
  const weekEvents = events
    .filter(e => {
      const key = londonDateKey(e.startsAt)
      return key >= weekStartKey && key <= weekEndKey
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4 sm:p-5">
        {/* Month/year + view toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <NavButton label="Previous" onClick={() => step(-1)}>
              <ChevronLeftIcon className="w-5 h-5" />
            </NavButton>
            <h2 className="min-w-[9.5rem] text-center text-lg font-bold text-[var(--color-text)]">
              {monthLabel(cursor)}
            </h2>
            <NavButton label="Next" onClick={() => step(1)}>
              <ChevronRightIcon className="w-5 h-5" />
            </NavButton>
          </div>

          <div className="seg-group inline-flex rounded-full p-1">
            <ToggleButton active={view === 'week'} onClick={() => switchView('week')}>Week</ToggleButton>
            <ToggleButton active={view === 'month'} onClick={() => switchView('month')}>Month</ToggleButton>
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
                    isSelected={isSameDay(date, selected)}
                    isDisabled={isBeforeDay(date, today)}
                    hasEvent={eventDays.has(ymd(date))}
                    onSelect={() => setSelected(date)}
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
        <h3 className="text-lg font-bold text-[var(--color-text)]">This week</h3>
        {weekEvents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No events this week.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {weekEvents.map(e => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="p-1.5 rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-sand)] hover:text-[var(--color-text)]"
    >
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
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${active ? 'seg-active' : 'seg-idle'}`}
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
  // The number "pill". Selected (and not today) fills; today keeps an outline.
  let pill = 'text-[var(--color-text)]'
  if (isDisabled) pill = 'text-[var(--color-text-muted)] opacity-40'
  else if (isSelected && !isToday) pill = 'text-white'
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
          isSelected && !isToday ? '' : isToday ? 'border-2 border-[var(--color-primary)]' : ''
        } ${!isDisabled && !isSelected ? 'group-hover:bg-[var(--color-sand)]' : ''}`}
        style={isSelected && !isToday ? { backgroundColor: 'var(--color-primary)' } : undefined}
      >
        {date.getDate()}
      </span>
      {/* Event dot — reserves its own height so numbers stay aligned. */}
      <span
        className={`h-1.5 w-1.5 rounded-full ${!hasEvent ? 'opacity-0' : isDisabled ? 'opacity-40' : ''}`}
        style={{ backgroundColor: 'var(--color-accent-tangerine)' }}
      />
    </button>
  )
}
