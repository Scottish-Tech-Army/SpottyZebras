import { createClient } from '@supabase/supabase-js'

/**
 * Server-ONLY Supabase client using the service-role key. This key bypasses RLS
 * and can use the Auth admin API, so it must never reach the browser — only
 * import this from route handlers / server code, never from a client component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
