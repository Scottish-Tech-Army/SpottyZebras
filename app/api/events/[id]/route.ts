import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const IMAGE_BUCKET = 'event-images'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

const fail = (error: string, status: number) => Response.json({ error }, { status })

/**
 * Returns a single event by id for any signed-in user — the event-details screen.
 * Mirrors the list route's shape (camelCase, signed image URL, spotsLeft counting
 * confirmed + live holds). The browser can't read the table directly (RLS), so it
 * sends its token and we read with the service-role client after verifying it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)

  const { data: r, error: qErr } = await admin
    .from('event')
    .select('id, title, description, start_time, end_time, location, image_url, age_range_min, age_range_max, price, max_capacity, status')
    .eq('id', id)
    .maybeSingle()

  if (qErr) {
    console.error('Event fetch failed:', qErr)
    return fail('Could not load the event.', 500)
  }
  if (!r) return fail('Event not found.', 404)

  // Sign the (private) image path, if any.
  let imageUrl: string | null = null
  if (r.image_url) {
    const { data: signed } = await admin.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(r.image_url, SIGNED_URL_TTL)
    imageUrl = signed?.signedUrl ?? null
  }

  // Spots left = capacity − (confirmed + live holds). Matches the list route.
  let spotsLeft: number | null = null
  if (r.max_capacity != null) {
    const { data: bookingRows } = await admin
      .from('booking')
      .select('status, hold_expires_at')
      .eq('event_id', id)
    const now = Date.now()
    let taken = 0
    for (const b of bookingRows ?? []) {
      const active =
        b.status === 'confirmed' ||
        (b.status === 'pending' && (!b.hold_expires_at || new Date(b.hold_expires_at).getTime() > now))
      if (active) taken += 1
    }
    spotsLeft = Math.max(0, r.max_capacity - taken)
  }

  const event = {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    startsAt: r.start_time,
    endsAt: r.end_time,
    location: r.location ?? '',
    imageUrl,
    ageMin: r.age_range_min,
    ageMax: r.age_range_max,
    price: Number(r.price) || 0,
    maxCapacity: r.max_capacity,
    spotsLeft,
    status: r.status ?? 'open',
  }

  return Response.json({ event })
}
