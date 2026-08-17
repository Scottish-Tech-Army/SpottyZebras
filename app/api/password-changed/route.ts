import { createAdminClient } from '@/lib/supabase-admin'
import { BRAND } from '@/lib/brand'

export const runtime = 'nodejs'

/**
 * Sends the "your password was changed" security notification. Called by the
 * reset-password page right after a successful password update, with the user's
 * (recovery) access token — we verify it, look up the email, and notify that
 * address so anyone whose password was changed without their knowledge is alerted.
 *
 * Always responds `{ ok: true }` and is best-effort: a mail failure must never make
 * the password change look like it failed (it already succeeded on the client).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return Response.json({ ok: true })

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.getUser(token)
    const email = data?.user?.email
    const name = (data?.user?.user_metadata?.full_name as string | undefined)?.trim() || null
    if (!error && email) await sendPasswordChangedEmail(email, name)
  } catch (e) {
    console.error('Password-changed notification failed:', e)
  }

  return Response.json({ ok: true })
}

// ─── Notification email (Resend) ─────────────────────────────────────────────

const escapeHtml = (v: string) =>
  v.replace(/[<>&]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[s]!))

async function sendPasswordChangedEmail(to: string, name: string | null) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.SIGNUP_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey) {
    console.warn('Email not configured (RESEND_API_KEY missing) — skipping password-changed email.')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `Your ${BRAND.name} password was changed`,
      html: buildPasswordChangedEmailHtml(name),
    }),
  })

  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

function buildPasswordChangedEmailHtml(name: string | null): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#F8F8F7;color:#1B2A3A">
  <div style="max-width:460px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee">
    <h1 style="font-size:20px;margin:0 0 12px">Your password was changed</h1>
    <p style="color:#3C4A5A;margin:0 0 16px;line-height:1.5">${greeting}</p>
    <p style="color:#3C4A5A;margin:0 0 16px;line-height:1.5">
      This is a confirmation that the password for your ${BRAND.name} account was just changed.
      If this was you, there's nothing more to do.
    </p>
    <p style="color:#3C4A5A;margin:0 0 20px;line-height:1.5">
      <strong>If you didn't make this change</strong>, please contact us straight away at
      <a href="mailto:${BRAND.email}" style="color:#2E7DC9;font-weight:bold;text-decoration:none">${BRAND.email}</a>
      so we can help secure your account.
    </p>
    <p style="color:#6A7684;margin:20px 0 0;font-size:12px">The ${BRAND.name} team</p>
  </div>
</body></html>`
}
