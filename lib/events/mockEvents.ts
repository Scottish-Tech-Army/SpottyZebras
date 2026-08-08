import { addDays } from './date'

/**
 * A single event, shaped after the `event` table (camelCase for the front end):
 *   start_time / end_time  → startsAt / endsAt  (timestamptz, ISO strings)
 *   image_url              → imageUrl
 *   age_range_min/max      → ageMin / ageMax
 *   price (0 = free), max_capacity, status
 *
 * Mocked for now; the real rows will arrive from Supabase in the same shape.
 */
export interface EventItem {
  id: string
  title: string
  description: string
  startsAt: string          // ISO instant (UTC), rendered in Europe/London
  endsAt: string | null
  location: string
  imageUrl: string | null
  ageMin: number | null
  ageMax: number | null
  price: number             // GBP; 0 = free
  maxCapacity: number
  status: string
}

/**
 * Builds the ISO instant for a UK wall-clock time on `day`. Constructing the
 * instant from Europe/London (not the runtime zone) keeps the demo times
 * correct through both BST and GMT — the same rule the real data relies on.
 */
function londonIso(day: Date, hh: number, mm: number): string {
  const guessUtc = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm)
  const offsetMin = londonOffsetMinutes(new Date(guessUtc))
  return new Date(guessUtc - offsetMin * 60000).toISOString()
}

/** How far Europe/London is from UTC at a given instant, in minutes. */
function londonOffsetMinutes(instant: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/London', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(instant).map(x => [x.type, x.value]),
  )
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return Math.round((asUtc - instant.getTime()) / 60000)
}

/** Events generated relative to `today`, so there's always something in the
 *  current week and the weeks ahead whatever the real date is. */
export function getMockEvents(today: Date): EventItem[] {
  const at = (offsetDays: number, hh: number, mm: number) =>
    londonIso(addDays(today, offsetDays), hh, mm)

  return [
    {
      id: 'e1',
      title: 'Messy art afternoon',
      description: 'Paint, glue and sensory play trays set up across the hall; aprons provided. akfajd adjvnaldkjnvljandvnladnlvna dvkledvlknadvknqevijevpodvnandv qldvknqv',
      startsAt: at(-3, 13, 30),
      endsAt: at(-3, 15, 0),
      location: 'Spotty Zebras HQ',
      imageUrl: 'https://picsum.photos/seed/sz-messy-art/1600/900',
      ageMin: 2,
      ageMax: 8,
      price: 0,
      maxCapacity: 20,
      status: 'open',
    },
    {
      id: 'e2',
      title: 'Saturday swim club',
      description: 'Weekly supervised swim session with trained lifeguards and quiet-hour lighting.',
      startsAt: at(0, 10, 0),
      endsAt: at(0, 11, 0),
      location: 'Glasgow Aquatics',
      imageUrl: 'https://picsum.photos/seed/sz-swim/1600/900',
      ageMin: 5,
      ageMax: 16,
      price: 0,
      maxCapacity: 15,
      status: 'open',
    },
    {
      id: 'e3',
      title: 'Park meetup',
      description: 'Free play and a ball game for all ages, weather permitting — bring a picnic.',
      startsAt: at(1, 10, 0),
      endsAt: at(1, 11, 30),
      location: 'Kelvingrove Park',
      imageUrl: null,
      ageMin: 0,
      ageMax: 12,
      price: 0,
      maxCapacity: 40,
      status: 'open',
    },
    {
      id: 'e4',
      title: 'Sensory story time',
      description: 'Gentle stories with props, lights and sounds for our youngest members.',
      startsAt: at(4, 11, 0),
      endsAt: at(4, 12, 0),
      location: 'Spotty Zebras HQ',
      imageUrl: 'https://picsum.photos/seed/sz-swim/1600/900',
      ageMin: 0,
      ageMax: 5,
      price: 0,
      maxCapacity: 12,
      status: 'open',
    },
    {
      id: 'e5',
      title: 'Family fun day at the park',
      description: 'Games, face painting and a picnic lunch for the whole family — sensory-friendly zone available all afternoon.',
      startsAt: at(7, 11, 0),
      endsAt: at(7, 15, 0),
      location: 'Kelvingrove Park',
      imageUrl: null,
      ageMin: 3,
      ageMax: 12,
      price: 8,
      maxCapacity: 60,
      status: 'open',
    },
    {
      id: 'e6',
      title: 'Woodland walk',
      description: 'An accessible trail walk with a nature scavenger hunt along the way.',
      startsAt: at(14, 10, 30),
      endsAt: at(14, 12, 30),
      location: 'Pollok Country Park',
      imageUrl: null,
      ageMin: 0,
      ageMax: 16,
      price: 0,
      maxCapacity: 30,
      status: 'open',
    },
    {
      id: 'e7',
      title: 'Teen social club',
      description: 'Games, music and a chill-out space for our older members to hang out.',
      startsAt: at(20, 16, 0),
      endsAt: at(20, 18, 0),
      location: 'Spotty Zebras HQ',
      imageUrl: 'https://picsum.photos/seed/sz-swim/1600/900',
      ageMin: 12,
      ageMax: 18,
      price: 0,
      maxCapacity: 25,
      status: 'open',
    },
  ]
}
