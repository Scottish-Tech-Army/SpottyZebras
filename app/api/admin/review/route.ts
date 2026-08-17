import { verifyReviewToken } from '@/lib/admin/reviewToken'
import { createAdminClient } from '@/lib/supabase-admin'
import { BRAND } from '@/lib/brand'

export const runtime = 'nodejs'

/**
 * Performs the actual approve/reject, triggered ONLY by the confirm button on the
 * review page (a real POST) — never by loading the emailed link. Re-verifies the
 * signed token here too; the page having rendered is not treated as authorisation.
 */
export async function POST(request: Request) {
  const form = await request.formData()
  const token = String(form.get('token') ?? '')
  const action = String(form.get('action') ?? '')

  const verified = verifyReviewToken(token)
  if (!verified) return htmlResult('Link expired', 'This action link is no longer valid. Nothing was changed.')
  if (action !== 'approve' && action !== 'reject') {
    return htmlResult('Unknown action', 'That action isn’t recognised. Nothing was changed.')
  }

  const admin = createAdminClient()

  if (action === 'approve') {
    const { error } = await admin.from('app_user').update({ is_active: true }).eq('id', verified.uid)
    if (error) {
      console.error('Approve failed:', error)
      return htmlResult('Something went wrong', 'The account could not be activated. Please try again.')
    }

    // Let the family know they can now sign in. Best-effort — the account is already
    // active, so an email failure must not fail the approval.
    try {
      const { data } = await admin.auth.admin.getUserById(verified.uid)
      const email = data?.user?.email
      const name = (data?.user?.user_metadata?.full_name as string | undefined)?.trim() || null
      if (email) await sendApprovalEmail(email, name, new URL(request.url).origin)
    } catch (e) {
      console.error('Approval email failed:', e)
    }

    return htmlResult('Approved ✓', 'The family’s account is now active. They can sign in.')
  }

  // reject → hard delete. Removing the auth user cascades to app_user →
  // parent_profile → child (the same ON DELETE CASCADE the signup flow relies on).
  // Grab the contact details BEFORE deleting — afterwards the user is gone.
  let rejectEmail: string | null = null
  let rejectName: string | null = null
  try {
    const { data } = await admin.auth.admin.getUserById(verified.uid)
    rejectEmail = data?.user?.email ?? null
    rejectName = (data?.user?.user_metadata?.full_name as string | undefined)?.trim() || null
  } catch (e) {
    console.error('Could not read user before rejection:', e)
  }

  const { error } = await admin.auth.admin.deleteUser(verified.uid)
  if (error) {
    console.error('Reject/delete failed:', error)
    return htmlResult('Something went wrong', 'The registration could not be deleted. Please try again.')
  }

  // Politely let them know — best-effort, never fail the rejection over an email.
  if (rejectEmail) {
    try {
      await sendRejectionEmail(rejectEmail, rejectName)
    } catch (e) {
      console.error('Rejection email failed:', e)
    }
  }

  return htmlResult('Rejected', 'The registration has been permanently deleted.')
}

// ─── Family approval email (Resend) ─────────────────────────────────────────

const escapeHtml = (v: string) =>
  v.replace(/[<>&]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[s]!))

async function sendApprovalEmail(to: string, name: string | null, origin: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.SIGNUP_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey) {
    console.warn('Email not configured (RESEND_API_KEY missing) — skipping approval email.')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `Your ${BRAND.name} account is approved`,
      html: buildApprovalEmailHtml(name, origin),
    }),
  })

  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

function buildApprovalEmailHtml(name: string | null, origin: string): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#F8F8F7;color:#1B2A3A">
  <div style="max-width:460px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee">
    <h1 style="font-size:20px;margin:0 0 12px">You're all set! 🎉</h1>
    <p style="color:#3C4A5A;margin:0 0 16px;line-height:1.5">${greeting}</p>
    <p style="color:#3C4A5A;margin:0 0 20px;line-height:1.5">
      Your ${BRAND.name} account has been approved. You can now sign in to book onto events and manage your family's details.
    </p>
    <a href="${origin}/login" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#2DA174;color:#fff;font-weight:bold;text-decoration:none">Sign in</a>
    <p style="color:#6A7684;margin:20px 0 0;font-size:12px">See you at an event soon — ${escapeHtml(BRAND.tagline)}</p>
  </div>
</body></html>`
}

// ─── Family rejection email (Resend) ────────────────────────────────────────

async function sendRejectionEmail(to: string, name: string | null) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.SIGNUP_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey) {
    console.warn('Email not configured (RESEND_API_KEY missing) — skipping rejection email.')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `About your ${BRAND.name} registration`,
      html: buildRejectionEmailHtml(name),
    }),
  })

  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

function buildRejectionEmailHtml(name: string | null): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#F8F8F7;color:#1B2A3A">
  <div style="max-width:460px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee">
    <h1 style="font-size:20px;margin:0 0 12px">About your registration</h1>
    <p style="color:#3C4A5A;margin:0 0 16px;line-height:1.5">${greeting}</p>
    <p style="color:#3C4A5A;margin:0 0 16px;line-height:1.5">
      Thank you for your interest in ${BRAND.name}. Unfortunately we weren't able to approve your
      registration at this time.
    </p>
    <p style="color:#3C4A5A;margin:0 0 20px;line-height:1.5">
      We'd genuinely love to help, so please don't hesitate to get in touch — we're always happy to talk it
      through and see how we can support your family. You can reach us at
      <a href="mailto:${BRAND.email}" style="color:#2E7DC9;font-weight:bold;text-decoration:none">${BRAND.email}</a>.
    </p>
    <p style="color:#6A7684;margin:20px 0 0;font-size:12px">With warm wishes, the ${BRAND.name} team</p>
  </div>
</body></html>`
}

/** Minimal self-contained result page (this route isn't part of the React app). */
function htmlResult(title: string, body: string): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} - ${BRAND.name}</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#F8F8F7;color:#1B2A3A">
  <div style="max-width:460px;margin:64px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;text-align:center">
    <h1 style="font-size:24px;margin:0 0 12px">${title}</h1>
    <p style="color:#6A7684;margin:0 0 24px">${body}</p>
    <a href="/" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#2DA174;color:#fff;font-weight:bold;text-decoration:none">Back to home</a>
  </div>
</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
