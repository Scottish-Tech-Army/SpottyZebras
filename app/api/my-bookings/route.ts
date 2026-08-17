import { createAdminClient } from '@/lib/supabase-admin'
import { ageFromDob } from '@/lib/age'

export const runtime = 'nodejs'

const fail = (error: string, status: number) => Response.json({ error }, { status })

/**
 * The signed-in parent's confirmed bookings, grouped by event (soonest event first),
 * for the "My bookings" screen. Each event carries the children this parent has
 * booked onto it (name + age) and its price, so the UI can offer cancellation on
 * free events only. The browser can't read these tables directly (RLS), so it sends
 * its token and we read with the service-role client after verifying it.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)
  const uid = userData.user.id

  const { data: bookings, error: bErr } = await admin
    .from('booking')
    .select('id, event_id, child_id')
    .eq('parent_id', uid)
    .eq('status', 'confirmed')
  if (bErr) {
    console.error('My-bookings query failed:', bErr)
    return fail('Could not load your bookings.', 500)
  }

  if (!bookings || bookings.length === 0) return Response.json({ events: [] })

  const eventIds = [...new Set(bookings.map(b => b.event_id))]
  const childIds = [...new Set(bookings.map(b => b.child_id))]

  // Only upcoming events — from the start of today onward (so an event later today
  // still shows). Past bookings drop off the list.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [{ data: events }, { data: children }] = await Promise.all([
    // Filter + order at the query level (soonest event first) so there's no post-fetch work.
    admin
      .from('event')
      .select('id, title, start_time, end_time, location, price')
      .in('id', eventIds)
      .gte('start_time', startOfToday.toISOString())
      .order('start_time', { ascending: true }),
    admin.from('child').select('id, full_name, date_of_birth').in('id', childIds),
  ])

  const childById = new Map((children ?? []).map(c => [c.id, c]))

  // Group the parent's booked children under each event.
  const grouped = new Map<string, { bookingId: string; childId: string; name: string; age: number }[]>()
  for (const b of bookings) {
    const child = childById.get(b.child_id)
    if (!child) continue
    const row = {
      bookingId: b.id,
      childId: b.child_id,
      name: child.full_name ?? '',
      age: ageFromDob(child.date_of_birth),
    }
    const list = grouped.get(b.event_id)
    if (list) list.push(row)
    else grouped.set(b.event_id, [row])
  }

  // Build straight from the DB-ordered events (soonest first) — the ordering lives
  // in the query above, so we just map over it in place.
  const result = (events ?? [])
    .filter(e => grouped.has(e.id))
    .map(e => {
      const price = Number(e.price) || 0
      return {
        id: e.id,
        title: e.title ?? '',
        startsAt: e.start_time ?? null,
        endsAt: e.end_time ?? null,
        location: e.location ?? '',
        price,
        isPaid: price > 0,
        children: (grouped.get(e.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
      }
    })

  return Response.json({ events: result })
}
