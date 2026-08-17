import { createAdminClient } from '@/lib/supabase-admin'
import { isEmail } from '@/lib/signup/validation'
import { BRAND } from '@/lib/brand'

export const runtime = 'nodejs'

/**
 * Starts the forgot-password flow. To avoid revealing who has an account (user
 * enumeration), this ALWAYS responds the same way — the client just shows
 * "you'll receive an email if it exists in our system". A reset email is only
 * actually sent when the address belongs to a real user.
 *
 * Flow: we mint a Supabase *recovery* token for the user and email a link to our
 * /reset-password page carrying that token's hash. The page calls verifyOtp with it,
 * which establishes a short-lived recovery session — enough to set a new password,
 * nothing else. We use the token_hash (not the default action_link) so the flow works
 * even when the email is opened on a different device/browser than it was requested on.
 */
export async function POST(request: Request) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: true }) // still generic — never leak parse errors as signals
  }

  const email = (body.email ?? '').trim()

  // Invalid input → generic OK too, so a caller can't probe validity differences.
  if (!isEmail(email)) return Response.json({ ok: true })

  try {
    const admin = createAdminClient()
    const origin = new URL(request.url).origin

    // generateLink both checks existence AND mints the token: it errors for an
    // unknown email, so a missing user simply means "no email sent". We take the
    // token_hash and build our own link to /reset-password (see the doc comment).
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${origin}/reset-password` },
    })

    const tokenHash = data?.properties?.hashed_token
    if (!error && tokenHash) {
      const link = `${origin}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
      await sendResetEmail(email, link)
    }
  } catch (e) {
    // Log server-side, but keep the response generic.
    console.error('Forgot-password failed:', e)
  }

  return Response.json({ ok: true })
}

// ─── Reset email (Resend) ────────────────────────────────────────────────────

async function sendResetEmail(to: string, actionLink: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.SIGNUP_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey) {
    console.warn('Email not configured (RESEND_API_KEY missing) — skipping reset email.')
    console.log(`[forgot-password] reset link for ${to}: ${actionLink}`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `Reset your ${BRAND.name} password`,
      html: buildResetEmailHtml(actionLink),
    }),
  })

  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

function buildResetEmailHtml(actionLink: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#F8F8F7;color:#1B2A3A">
  <div style="max-width:460px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee">
    <h1 style="font-size:20px;margin:0 0 12px">Reset your password</h1>
    <p style="color:#3C4A5A;margin:0 0 20px;line-height:1.5">
      We received a request to reset the password for your ${BRAND.name} account.
      Click the button below to choose a new one. If you didn't ask for this, you can safely ignore this email.
    </p>
    <a href="${actionLink}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#2DA174;color:#fff;font-weight:bold;text-decoration:none">Reset password</a>
    <p style="color:#6A7684;margin:20px 0 0;font-size:12px">This link can only be used once and expires shortly for your security.</p>
  </div>
</body></html>`
}
