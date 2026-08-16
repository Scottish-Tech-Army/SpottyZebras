import { createAdminClient } from '@/lib/supabase-admin'
import { signReviewToken } from '@/lib/admin/reviewToken'
import { toParentProfileRow, toChildRows, loginEmailFor } from '@/lib/signup/mapToDb'
import {
  validateCarer, validateChild, validateEmergency, crossCarerErrors,
  isCarerEmpty, hasAnySupportNeeds, isPasswordValid,
} from '@/lib/signup/validation'
import { PARENT1_REQUIRED, PARENT2_REQUIRED, MAX_CHILDREN } from '@/lib/signup/constants'
import type { SignupData } from '@/lib/signup/types'

export const runtime = 'nodejs'

const fail = (error: string, status: number) => Response.json({ error }, { status })

/**
 * Re-validate on the server — the client checks are UX only and fully bypassable.
 * Returns a message on the first problem, or null when everything is valid.
 */
function validateSignup(d: SignupData): string | null {
  if (!d || !d.carer1 || !d.emergency || !Array.isArray(d.children)) return 'Missing registration details.'

  if (Object.keys(validateCarer(d.carer1, PARENT1_REQUIRED)).length) return 'Parent / carer 1 details are invalid.'

  const carer2 = d.carer2 && !isCarerEmpty(d.carer2) ? d.carer2 : null
  if (carer2) {
    if (Object.keys(validateCarer(carer2, PARENT2_REQUIRED)).length) return 'Second carer details are invalid.'
    if (Object.keys(crossCarerErrors(d.carer1, carer2)).length) return 'The second carer can’t reuse carer 1’s email or number.'
  }

  if (Object.keys(validateEmergency(d.emergency, d.carer1, carer2).errors).length) return 'Emergency contact details are invalid.'

  if (d.children.length < 1 || d.children.length > MAX_CHILDREN) return `Please add between 1 and ${MAX_CHILDREN} children.`
  if (d.children.some(c => Object.keys(validateChild(c)).length)) return 'One of the children’s details is invalid.'
  if (!hasAnySupportNeeds(d.children)) return 'At least one child must have additional support needs recorded.'

  if (!isPasswordValid(d.password)) return 'Password does not meet the requirements.'
  if (!d.agreedToTerms) return 'You must agree to the terms and privacy policy.'

  return null
}

export async function POST(request: Request) {
  let data: SignupData
  try {
    data = await request.json()
  } catch {
    return fail('Invalid request.', 400)
  }

  const problem = validateSignup(data)
  if (problem) return fail(problem, 400)

  const admin = createAdminClient()
  const email = loginEmailFor(data)

  // 1) Create the auth user. email_confirm: true auto-confirms the email so the
  //    ONLY gate to using the app is is_active (set false below, until admin approval).
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: data.password,          // used to create the user, then discarded — never stored by us
    email_confirm: true,
    user_metadata: { full_name: data.carer1.fullName.trim() },
  })

  if (authError || !created?.user) {
    const already = authError?.message?.toLowerCase().includes('already')
    return fail(already ? 'An account with this email already exists.' : 'Could not create the account.', 400)
  }
  const userId = created.user.id

  // 2) Insert the profile rows. If anything fails, delete the auth user so we
  //    never leave an orphaned login. This relies on the app_user → auth.users FK
  //    using ON DELETE CASCADE (so app_user → parent_profile → child are removed too).
  try {
    const { error: e1 } = await admin.from('app_user').insert({
      id: userId,
      full_name: data.carer1.fullName.trim(),
      role: 'parent',       // registration is always for a parent
      is_active: false,     // stays inactive until an admin approves
    })
    if (e1) throw e1

    const { error: e2 } = await admin
      .from('parent_profile')
      .insert({ user_id: userId, ...toParentProfileRow(data) })
    if (e2) throw e2

    // child.parent_id is a FK to app_user.id (= the auth uid), so children hang off
    // the same user id as everything else. This keeps RLS a simple parent_id = auth.uid().
    const childRows = toChildRows(data).map(c => ({ ...c, parent_id: userId }))
    const { error: e3 } = await admin.from('child').insert(childRows)
    if (e3) throw e3
  } catch (e) {
    await admin.auth.admin.deleteUser(userId).catch(() => {}) // best-effort rollback
    console.error('Signup DB write failed:', e)
    return fail('Could not save your registration. Please try again.', 500)
  }

  // 3) Notify the admin team. Best-effort — the registration is already saved, so
  //    an email failure must not fail the request. The email carries signed
  //    Approve/Reject links, so `userId` and the site origin are needed to build them.
  try {
    await sendAdminEmail(data, userId, new URL(request.url).origin)
  } catch (e) {
    console.error('Admin notification email failed:', e)
  }

  return Response.json({ ok: true })
}

// ─── Admin notification email (Resend) ──────────────────────────────────────

async function sendAdminEmail(data: SignupData, userId: string, origin: string) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ADMIN_EMAIL
  const from = process.env.SIGNUP_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey || !to) {
    console.warn('Email not configured (RESEND_API_KEY / ADMIN_EMAIL missing) — skipping admin notification.')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `New family registration — ${data.carer1.fullName.trim()}`,
      html: buildAdminEmailHtml(data, userId, origin),
    }),
  })

  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

/** Builds the summary email from the SAME mapped rows we save — and never the password. */
function buildAdminEmailHtml(data: SignupData, userId: string, origin: string): string {
  const p = toParentProfileRow(data)
  const kids = toChildRows(data)
  const esc = (v: unknown) => String(v ?? '—').replace(/[<>&]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[s]!))
  const row = (label: string, value: unknown) => `<p style="margin:2px 0"><strong>${label}:</strong> ${esc(value)}</p>`

  const carer2Block = p.second_carer_name
    ? `<h3>Second carer</h3>
       ${row('Name', p.second_carer_name)}
       ${row('Email', p.second_carer_email)}
       ${row('Phone', p.second_carer_phone)}
       ${row('Address', [p.second_carer_address_line_1, p.second_carer_address_line_2, p.second_carer_town, p.second_carer_postcode].filter(Boolean).join(', '))}`
    : ''

  // Signed link to the review page — a single Review button; Approve/Reject live on
  // that page. The token grants review access and expires in 14 days.
  const reviewUrl = `${origin}/admin/review?token=${encodeURIComponent(signReviewToken(userId))}`
  const actionsBlock = `
    <div style="margin:8px 0;padding:20px;background:#F8F8F7;border-radius:8px;text-align:center">
      <a href="${reviewUrl}" style="display:inline-block;padding:12px 40px;border-radius:8px;background:#2DA174;color:#ffffff;font-weight:bold;text-decoration:none">Review</a>
      <p style="margin:14px 0 0;font-size:12px;color:#6A7684">Use the Approve / Reject buttons on the next screen. Approving activates the family's account; rejecting permanently deletes their registration. This link expires in 14 days.</p>
    </div>`

  const childrenBlock = kids.map((c, i) => `
    <h3>Child ${i + 1}</h3>
    ${row('Name', c.full_name)}
    ${row('Date of birth', c.date_of_birth)}
    ${row('Additional support needs', c.additional_support_needs)}
    ${row('Allergies', c.allergies)}
    ${row('Photo consent', c.photo_consent ? 'Yes' : 'No')}
    ${row('Address', [c.address_line_1, c.address_line_2, c.town, c.postcode].filter(Boolean).join(', '))}
  `).join('')

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#1B2A3A">
      <h2>New family registration (pending approval)</h2>
      <h3>Parent / carer 1</h3>
      ${row('Name', p.full_name)}
      ${row('Email', p.email)}
      ${row('Phone', p.phone)}
      ${row('Address', [p.address_line_1, p.address_line_2, p.town, p.postcode].filter(Boolean).join(', '))}
      ${carer2Block}
      <h3>Emergency contact</h3>
      ${row('Name', p.emergency_contact_name)}
      ${row('Phone', p.emergency_contact_phone)}
      ${childrenBlock}
      ${row('How they heard about us', p.referral_source)}
      <hr />
      ${actionsBlock}
    </div>
  `
}
