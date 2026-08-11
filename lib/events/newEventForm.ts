import { addMonths, endOfMonth, startOfMonth, ymd } from './date'

/** The create-event form's raw (string) values. */
export interface EventFormValues {
  title: string
  description: string
  date: string       // yyyy-mm-dd
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  location: string
  ageMin: string
  ageMax: string
  capacity: string
  price: string
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>

/** Fields that must be filled in - drives both the "*" markers and validation. */
export const REQUIRED_FIELDS = ['title', 'description', 'location', 'date', 'startTime'] as const

export const MAX_AGE = 18

// Kept short so the whole title/description is always visible on an event card
// (phone and web) — there's no event-details screen to fall back to.
export const TITLE_MAX = 50
export const DESCRIPTION_MAX = 160

const digits = (v: string) => v.replace(/\D/g, '')

/** Age 0–18, digits only (nothing above 18 can be entered). */
export const clampAge = (v: string): string => {
  const d = digits(v)
  return d === '' ? '' : String(Math.min(Number(d), MAX_AGE))
}

/** Up to 3 digits (0–999) — for price and capacity. */
export const cap3 = (v: string): string => digits(v).slice(0, 3)

/** Applies the right sanitiser as the user types; passthrough for text fields. */
export function sanitizeEventField(field: keyof EventFormValues, v: string): string {
  switch (field) {
    case 'ageMin':
    case 'ageMax':   return clampAge(v)
    case 'capacity':
    case 'price':    return cap3(v)
    default:         return v
  }
}

/** Today (local) as yyyy-mm-dd - the earliest allowed event date. */
export const minEventDate = (): string => ymd(new Date())

/** The latest allowed event date: the end of the 6-month window (this month plus
 *  the next 5), matching the calendar's horizon. */
export const maxEventDate = (): string => ymd(endOfMonth(addMonths(startOfMonth(new Date()), 5)))

const REQUIRED_MSG: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  title:       'Please enter a title.',
  description: 'Please enter a description.',
  location:    'Please enter a location.',
  date:        'Please enter a date.',
  startTime:   'Please enter a start time.',
}

export function validateEventForm(v: EventFormValues): EventFormErrors {
  const e: EventFormErrors = {}

  for (const f of REQUIRED_FIELDS) {
    if (!v[f].trim()) e[f] = REQUIRED_MSG[f]
  }

  // Events are always upcoming - the date can't be earlier than today...
  if (v.date && !e.date && v.date < minEventDate()) {
    e.date = 'The date can’t be in the past.'
  }
  // ...nor more than 6 months ahead (the calendar's window).
  if (v.date && !e.date && v.date > maxEventDate()) {
    e.date = 'The date can’t be more than 6 months ahead.'
  }

  // If an end time is given, it must come after the start.
  if (v.startTime && v.endTime && v.endTime <= v.startTime) {
    e.endTime = 'The end time must be after the start time.'
  }

  // Both ages are optional, but a given range must be the right way round.
  if (v.ageMin && v.ageMax && Number(v.ageMin) > Number(v.ageMax)) {
    e.ageMax = 'The oldest age must be at least the youngest.'
  }

  return e
}
