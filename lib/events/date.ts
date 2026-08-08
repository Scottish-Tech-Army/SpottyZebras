// ─── Small, dependency-free date helpers for the events calendar ───────────
// All comparisons are date-only (local time). Weeks start on Sunday to match
// the S M T W T F S header in the design.

/** Local `YYYY-MM-DD` key — safe for comparing / looking up days. */
export function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Midnight of the given day (strips the time component). */
export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Same calendar day, keeping to the 1st to avoid month-length overflow. */
export function addMonths(d: Date, n: number): Date {
  const x = startOfDay(d)
  x.setDate(1)
  x.setMonth(x.getMonth() + n)
  return x
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

/** The Sunday on or before `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  return addDays(x, -x.getDay())
}

export function isSameDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b)
}

/** True when `a` falls on an earlier calendar day than `b`. */
export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

/** The 7 days (Sun→Sat) of the week containing `d`. */
export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * The month of `d` laid out as rows of 7. Cells outside the month are `null`
 * so they render blank (the design shows no leading/trailing dates).
 */
export function monthMatrix(d: Date): (Date | null)[][] {
  const first = startOfMonth(d)
  const offset = first.getDay() // 0 = Sunday
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const rows = Math.ceil((offset + daysInMonth) / 7)

  const cells: (Date | null)[][] = []
  let dayNum = 1
  for (let r = 0; r < rows; r++) {
    const row: (Date | null)[] = []
    for (let c = 0; c < 7; c++) {
      const cellIndex = r * 7 + c
      if (cellIndex < offset || dayNum > daysInMonth) {
        row.push(null)
      } else {
        row.push(new Date(first.getFullYear(), first.getMonth(), dayNum))
        dayNum++
      }
    }
    cells.push(row)
  }
  return cells
}

/**
 * The UK-local (`Europe/London`) calendar day of an instant, as a `YYYY-MM-DD`
 * key. Bucketing must happen in London time, not UTC — an event just after
 * midnight BST belongs to the local day, not the previous UTC one.
 */
export function londonDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find(p => p.type === t)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** e.g. "August 2026" */
export function monthLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}
