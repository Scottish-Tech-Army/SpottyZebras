import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * Returns the signed-in donor's saved details to pre-fill the donation form.
 * The browser can't read app_user / parent_profile directly (RLS), so it sends its
 * access token and we read those rows with the service-role client after verifying it.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return Response.json({ error: 'Missing token' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userData, error } = await admin.auth.getUser(token)
  if (error || !userData?.user) return Response.json({ error: 'Invalid session' }, { status: 401 })

  const uid = userData.user.id
  const [{ data: appUser }, { data: profile }] = await Promise.all([
    admin.from('app_user').select('full_name').eq('id', uid).maybeSingle(),
    admin
      .from('parent_profile')
      .select('email, address_line_1, address_line_2, town, postcode')
      .eq('user_id', uid)
      .maybeSingle(),
  ])

  return Response.json({
    fullName: appUser?.full_name ?? null,
    email: profile?.email ?? userData.user.email ?? null,
    addressLine1: profile?.address_line_1 ?? null,
    addressLine2: profile?.address_line_2 ?? null,
    city: profile?.town ?? null,
    postcode: profile?.postcode ?? null,
  })
}
