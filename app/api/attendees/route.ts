import { createAdminClient } from '@/lib/supabase-admin'
import { ageFromDob } from '@/lib/age'

export const runtime = 'nodejs'

const fail = (error: string, status: number) => Response.json({ error }, { status })

/**
 * Admin-only. Two modes:
 *   GET /api/attendees            → the events list for the picker
 *                                   { events: [{ id, title, startsAt, endsAt }] }
 *   GET /api/attendees?eventId=X  → who's coming to that event
 *                                   { attendees: [{ childId, name, age, supportNeeds, allergies }] }
 *
 * The browser can't read these tables directly (RLS); it sends its token and we
 * read with the service-role client after verifying the caller is an admin.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)

  const { data: appUser } = await admin
    .from('app_user')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (appUser?.role !== 'admin') return fail('Only admins can view attendees.', 403)

  const eventId = new URL(request.url).searchParams.get('eventId')

  // ── Attendees for one event ────────────────────────────────────────────────
  if (eventId) {
    const { data: bookings, error: bErr } = await admin
      .from('booking')
      .select('child_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')
    if (bErr) {
      console.error('Attendees query failed:', bErr)
      return fail('Could not load attendees.', 500)
    }

    const childIds = [...new Set((bookings ?? []).map(b => b.child_id))]
    if (childIds.length === 0) return Response.json({ attendees: [] })

    const { data: children } = await admin
      .from('child')
      .select('id, full_name, date_of_birth, additional_support_needs, allergies, photo_consent')
      .in('id', childIds)

    const attendees = (children ?? [])
      .map(c => ({
        childId: c.id,
        name: c.full_name ?? '',
        age: ageFromDob(c.date_of_birth),
        supportNeeds: c.additional_support_needs ?? '',
        allergies: c.allergies ?? '',
        photoConsent: c.photo_consent === true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return Response.json({ attendees })
  }

  // ── Events list for the picker ─────────────────────────────────────────────
  const { data: rows, error: eErr } = await admin
    .from('event')
    .select('id, title, start_time, end_time')
  if (eErr) {
    console.error('Attendees event list failed:', eErr)
    return fail('Could not load events.', 500)
  }

  // Upcoming events only (soonest → latest); past events are excluded for now.
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const todayMs = startOfToday.getTime()
  const ms = (s: string | null) => (s ? new Date(s).getTime() : 0)
  const events = (rows ?? [])
    .map(r => ({ id: r.id, title: r.title ?? '', startsAt: r.start_time, endsAt: r.end_time }))
    .filter(e => ms(e.startsAt) >= todayMs)
    .sort((a, b) => ms(a.startsAt) - ms(b.startsAt))

  return Response.json({ events })
}
