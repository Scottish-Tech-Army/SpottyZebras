/**
 * A single event as the front end renders it (camelCase). Mirrors the `event`
 * table; `startsAt`/`endsAt` are ISO instants shown in Europe/London, and
 * `imageUrl` is a short-lived signed URL minted by the read API (private bucket).
 */
export interface EventItem {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  location: string
  imageUrl: string | null
  ageMin: number | null
  ageMax: number | null
  price: number             // GBP; 0 = free
  maxCapacity: number | null // null = no limit
  spotsLeft: number | null   // remaining capacity (maxCapacity − bookings); null = no limit
  status: string
}
