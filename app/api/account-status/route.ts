import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * Reports whether the signed-in user's account is active (approved by an admin).
 *
 * The caller passes their just-issued access token as a Bearer header. We verify
 * that token server-side (so a client can't spoof another user's id), then read
 * app_user.is_active with the service-role client — which works regardless of how
 * RLS is configured on app_user. Login uses this to block unapproved parents.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return Response.json({ error: 'Missing token' }, { status: 401 })

  const admin = createAdminClient()

  // Validates the JWT against the auth server and returns the real user it belongs to.
  const { data: userData, error } = await admin.auth.getUser(token)
  if (error || !userData?.user) return Response.json({ error: 'Invalid session' }, { status: 401 })

  const { data: row } = await admin
    .from('app_user')
    .select('is_active, role, full_name')
    .eq('id', userData.user.id)
    .maybeSingle()

  // No row (shouldn't happen for a real user) is treated as not-active, failing safe.
  // Role drives the nav menu and full_name the greeting; the browser client can't read
  // app_user directly (RLS), so this server route (service-role) is the reliable source.
  return Response.json({
    active: !!row?.is_active,
    role: row?.role ?? null,
    fullName: row?.full_name ?? null,
  })
}
