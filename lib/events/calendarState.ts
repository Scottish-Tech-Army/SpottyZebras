export type CalendarView = 'week' | 'month'

interface CalendarState {
  view: CalendarView
  cursor: Date | null
  selectedDay: Date | null
}

/**
 * Module-level singleton holding the events calendar's last view / period / selected
 * day. It survives the screen unmounting (e.g. opening an event's details and coming
 * back) so the user returns to where they were.
 *
 * Because it lives for the whole tab session — NOT per user — it must be cleared on
 * sign-out via `resetCalendarState()`, otherwise the next user who signs in (no page
 * reload happens on sign-out) would inherit the previous user's calendar state. The
 * same caveat would apply to sessionStorage/localStorage: none of them are user-scoped.
 */
export const calendarState: CalendarState = {
  view: 'week',
  cursor: null,
  selectedDay: null,
}

/** Clear the retained calendar state. Call on sign-out. */
export function resetCalendarState() {
  calendarState.view = 'week'
  calendarState.cursor = null
  calendarState.selectedDay = null
}
