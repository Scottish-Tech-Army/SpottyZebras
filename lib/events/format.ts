// ─── How events read on the card ───────────────────────────────────────────
// Every date/time is formatted in `Europe/London` explicitly. The stored value
// is an absolute instant (timestamptz); the runtime's own timezone (UTC on
// Vercel) must NOT leak into what the user sees.

const LONDON = 'Europe/London'

/** "11:00" (24h, UK local). */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(iso))
}

/** "Sat 15 Aug" (UK local). */
export function formatDayLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON, weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(iso))
}

/** "Sat 15 Aug · 11:00–15:00" — the end time is dropped when absent. */
export function formatEventWhen(startsAt: string, endsAt: string | null): string {
  const range = endsAt ? `${formatTime(startsAt)}–${formatTime(endsAt)}` : formatTime(startsAt)
  return `${formatDayLabel(startsAt)} · ${range}`
}

/** "Ages 3 – 12" / "Ages 5+" / "Up to 12" / "All ages". */
export function ageLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `Ages ${min} – ${max}`
  if (min != null) return `Ages ${min}+`
  if (max != null) return `Up to ${max}`
  return 'All ages'
}

/** "Free" when price is 0, otherwise "£8" / "£8.50". */
export function priceLabel(price: number): string {
  if (price <= 0) return 'Free'
  return Number.isInteger(price) ? `£${price}` : `£${price.toFixed(2)}`
}
