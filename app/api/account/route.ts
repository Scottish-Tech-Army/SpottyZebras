import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * Returns everything the Account screen shows for the signed-in user. The browser
 * can't read app_user / parent_profile / child directly (RLS), so it sends its
 * access token and we read those rows with the service-role client after verifying it.
 *
 *   admin  → { role, name, email, parent: null }
 *   parent → { role, name, email, parent: { carer1, carer2, emergency, children } }
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return Response.json({ error: 'Missing token' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userData, error } = await admin.auth.getUser(token)
  if (error || !userData?.user) return Response.json({ error: 'Invalid session' }, { status: 401 })

  const uid = userData.user.id
  const email = userData.user.email ?? ''

  const { data: appUser } = await admin
    .from('app_user')
    .select('full_name, role')
    .eq('id', uid)
    .maybeSingle()

  const role = appUser?.role === 'admin' ? 'admin' : 'parent'
  const name = appUser?.full_name ?? ''

  if (role === 'admin') {
    return Response.json({ role, name, email, parent: null })
  }

  const { data: p } = await admin
    .from('parent_profile')
    .select('full_name, email, phone, address_line_1, address_line_2, town, postcode, second_carer_name, second_carer_email, second_carer_phone, second_carer_address_line_1, second_carer_address_line_2, second_carer_town, second_carer_postcode, emergency_contact_name, emergency_contact_phone')
    .eq('user_id', uid)
    .maybeSingle()

  // child.parent_id is the app_user id (= uid). Oldest first.
  const { data: kids } = await admin
    .from('child')
    .select('full_name, date_of_birth, additional_support_needs, allergies, photo_consent')
    .eq('parent_id', uid)
    .order('date_of_birth', { ascending: true })

  const parent = p
    ? {
        carer1: {
          name: p.full_name ?? name,
          email: p.email ?? '',
          phone: displayPhone(p.phone),
          address: clubAddress(p.address_line_1, p.address_line_2, p.town, p.postcode),
        },
        carer2: p.second_carer_name
          ? {
              name: p.second_carer_name,
              email: p.second_carer_email ?? '',
              phone: displayPhone(p.second_carer_phone),
              address: clubAddress(
                p.second_carer_address_line_1,
                p.second_carer_address_line_2,
                p.second_carer_town,
                p.second_carer_postcode,
              ),
            }
          : null,
        emergency: {
          name: p.emergency_contact_name ?? '',
          phone: displayPhone(p.emergency_contact_phone),
        },
        children: (kids ?? []).map(c => ({
          name: c.full_name ?? '',
          age: ageFromDob(c.date_of_birth),
          specialNeeds: c.additional_support_needs ?? '',
          allergies: c.allergies ?? '',
          photoConsent: !!c.photo_consent,
        })),
      }
    : null

  return Response.json({ role, name, email, parent })
}

/** Joins the address parts into one line, skipping blanks. */
const clubAddress = (...parts: (string | null)[]) =>
  parts.map(p => p?.trim()).filter(Boolean).join(', ')

/** Phones are stored E.164 (+44…); show the +44 country code, lightly grouped
 *  (e.g. +447700900001 → "+44 7700 900001"). */
function displayPhone(v: string | null): string {
  if (!v) return ''
  const s = v.trim()
  const m = s.match(/^\+44(\d+)$/)
  if (!m) return s
  const nat = m[1] // national digits, no leading 0
  return nat.length >= 10 ? `+44 ${nat.slice(0, 4)} ${nat.slice(4)}` : `+44 ${nat}`
}

/** Whole years from a mandatory ISO date of birth. */
function ageFromDob(dob: string): number {
  const b = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}
