import { createAdminClient } from '@/lib/supabase-admin'
import { londonInstant } from '@/lib/events/date'
import { validateEventForm, sanitizeEventField, type EventFormValues } from '@/lib/events/newEventForm'

export const runtime = 'nodejs'

const IMAGE_BUCKET = 'event-images'
// Backstop only — the client downscales images to well under this before upload.
const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1 MB

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  Response.json({ error, ...extra }, { status })

const SIGNED_URL_TTL = 60 * 60 // 1 hour

/**
 * Lists events from today through the next 6 months (the calendar's window), for
 * any signed-in user. The browser can't read the table directly (RLS), so it
 * sends its token and we read with the service-role client after verifying it.
 * Image paths (private bucket) are turned into short-lived signed URLs.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)

  // Window: from the start of today to ~6 months ahead. Buffered by a day/week so
  // timezone edges and week-view spillover can't drop an event the calendar shows;
  // the client filters to the exact visible range anyway.
  const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - 1)
  const to = new Date(); to.setMonth(to.getMonth() + 6); to.setDate(to.getDate() + 7)

  const { data: rows, error: qErr } = await admin
    .from('event')
    .select('id, title, description, start_time, end_time, location, image_url, age_range_min, age_range_max, price, max_capacity, status')
    .gte('start_time', from.toISOString())
    .lte('start_time', to.toISOString())
    .order('start_time', { ascending: true })

  if (qErr) {
    console.error('Event list query failed:', qErr)
    return fail('Could not load events.', 500)
  }

  // Sign the (private) image paths in one batch, then map each event to its URL.
  const paths = (rows ?? []).map(r => r.image_url).filter((p): p is string => !!p)
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data: urls } = await admin.storage.from(IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
    for (const u of urls ?? []) {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
    }
  }

  // Count spots taken per event so cards can show spots remaining. A spot is taken
  // when it's confirmed OR held by an in-flight payment (pending, not yet expired) —
  // so a held seat correctly shows as unavailable while someone's checking out.
  const eventIds = (rows ?? []).map(r => r.id)
  const bookedCount = new Map<string, number>()
  if (eventIds.length > 0) {
    const { data: bookingRows } = await admin
      .from('booking')
      .select('event_id, status, hold_expires_at')
      .in('event_id', eventIds)
    const now = Date.now()
    for (const b of bookingRows ?? []) {
      const active =
        b.status === 'confirmed' ||
        (b.status === 'pending' && (!b.hold_expires_at || new Date(b.hold_expires_at).getTime() > now))
      if (active) bookedCount.set(b.event_id, (bookedCount.get(b.event_id) ?? 0) + 1)
    }
  }

  const events = (rows ?? []).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    startsAt: r.start_time,
    endsAt: r.end_time,
    location: r.location ?? '',
    imageUrl: r.image_url ? signed.get(r.image_url) ?? null : null,
    ageMin: r.age_range_min,
    ageMax: r.age_range_max,
    price: Number(r.price) || 0,
    maxCapacity: r.max_capacity,
    spotsLeft: r.max_capacity == null ? null : Math.max(0, r.max_capacity - (bookedCount.get(r.id) ?? 0)),
    status: r.status ?? 'open',
  }))

  return Response.json({ events })
}

/**
 * Creates an event. Admin-only: the caller sends their access token as a Bearer
 * header; we verify it, confirm the app_user is an admin, re-validate the form
 * (client checks are UX only), optionally upload the image, then insert the row
 * with the service-role client. Body is multipart/form-data (so the image can ride
 * along) with the same field names the form uses.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return fail('Missing token', 401)

  const admin = createAdminClient()

  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !userData?.user) return fail('Invalid session', 401)
  const uid = userData.user.id

  const { data: appUser } = await admin
    .from('app_user')
    .select('role')
    .eq('id', uid)
    .maybeSingle()
  if (appUser?.role !== 'admin') return fail('Only admins can create events.', 403)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail('Invalid request.', 400)
  }

  // Re-apply the field sanitisers server-side (client clamps are bypassable), so
  // ages stay 0–18 and price/capacity stay within 3 digits regardless of input.
  const field = (k: keyof EventFormValues) =>
    sanitizeEventField(k, (form.get(k)?.toString() ?? '').trim())
  const values: EventFormValues = {
    title: field('title'),
    description: field('description'),
    date: field('date'),
    startTime: field('startTime'),
    endTime: field('endTime'),
    location: field('location'),
    ageMin: field('ageMin'),
    ageMax: field('ageMax'),
    capacity: field('capacity'),
    price: field('price'),
  }

  const fieldErrors = validateEventForm(values)
  if (Object.keys(fieldErrors).length > 0) {
    return fail('Please check the highlighted fields.', 400, { fieldErrors })
  }

  // Optional image → private Storage bucket. We keep the object PATH (not a URL):
  // the bucket is private, so the events read API mints a short-lived signed URL
  // per request — only logged-in users ever get a working link.
  let imagePath: string | null = null
  const image = form.get('image')
  if (image && typeof image !== 'string' && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) return fail('The image must be under 1 MB.', 400)

    const ext = (image.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage
      .from(IMAGE_BUCKET)
      .upload(path, await image.arrayBuffer(), {
        contentType: image.type || 'application/octet-stream',
        upsert: false,
      })
    if (upErr) {
      console.error('Event image upload failed:', upErr)
      return fail('Could not upload the image. Please try again.', 500)
    }
    imagePath = path
  }

  const row = {
    created_by: uid,
    title: values.title,
    description: values.description || null,
    start_time: londonInstant(values.date, values.startTime),
    end_time: values.endTime ? londonInstant(values.date, values.endTime) : null,
    location: values.location || null,
    image_url: imagePath, // stores the Storage object path, signed on read
    age_range_min: values.ageMin ? Number(values.ageMin) : null,
    age_range_max: values.ageMax ? Number(values.ageMax) : null,
    price: values.price ? Number(values.price) : 0,
    max_capacity: values.capacity ? Number(values.capacity) : null, // blank = no limit
    status: 'open',
  }

  const { data: inserted, error: insErr } = await admin
    .from('event')
    .insert(row)
    .select('id')
    .single()

  if (insErr) {
    console.error('Event insert failed:', insErr)
    return fail('Could not create the event. Please try again.', 500)
  }

  return Response.json({ ok: true, id: inserted.id })
}
