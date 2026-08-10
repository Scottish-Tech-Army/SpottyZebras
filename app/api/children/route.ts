import { createAdminClient } from '@/lib/supabase-admin'
import { ageFromDob } from '@/lib/age'

export const runtime = 'nodejs'

/**
 * The signed-in parent's own children (for the RSVP dialog): id, name, age, and
 * any support needs / allergies. The browser can't read `child` directly (RLS),
 * so it sends its token and we read with the service-role client after verifying.
 * child.parent_id is the app_user id (= auth uid).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return Response.json({ error: 'Missing token' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userData, error } = await admin.auth.getUser(token)
  if (error || !userData?.user) return Response.json({ error: 'Invalid session' }, { status: 401 })

  const { data: kids, error: qErr } = await admin
    .from('child')
    .select('id, full_name, date_of_birth, additional_support_needs, allergies')
    .eq('parent_id', userData.user.id)
    .order('date_of_birth', { ascending: true })

  if (qErr) {
    console.error('Children query failed:', qErr)
    return Response.json({ error: 'Could not load children.' }, { status: 500 })
  }

  const children = (kids ?? []).map(c => ({
    id: c.id,
    name: c.full_name ?? '',
    age: ageFromDob(c.date_of_birth),
    specialNeeds: c.additional_support_needs ?? '',
    allergies: c.allergies ?? '',
  }))

  return Response.json({ children })
}
