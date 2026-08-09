import { createAdminClient } from '@/lib/supabase-admin'
import { londonInstant } from '@/lib/events/date'
import { validateEventForm, sanitizeEventField, type EventFormValues } from '@/lib/events/newEventForm'

export const runtime = 'nodejs'

const IMAGE_BUCKET = 'event-images'
// Backstop only — the client downscales images to well under this before upload.
const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1 MB

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  Response.json({ error, ...extra }, { status })

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
