import { verifyReviewToken } from '@/lib/admin/reviewToken'
import { createAdminClient } from '@/lib/supabase-admin'

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
    return htmlResult('Approved ✓', 'The family’s account is now active. They can sign in.')
  }

  // reject → hard delete. Removing the auth user cascades to app_user →
  // parent_profile → child (the same ON DELETE CASCADE the signup flow relies on).
  const { error } = await admin.auth.admin.deleteUser(verified.uid)
  if (error) {
    console.error('Reject/delete failed:', error)
    return htmlResult('Something went wrong', 'The registration could not be deleted. Please try again.')
  }
  return htmlResult('Rejected', 'The registration has been permanently deleted.')
}

/** Minimal self-contained result page (this route isn't part of the React app). */
function htmlResult(title: string, body: string): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Spotty Zebras</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#F8F8F7;color:#1B2A3A">
  <div style="max-width:460px;margin:64px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;text-align:center">
    <h1 style="font-size:24px;margin:0 0 12px">${title}</h1>
    <p style="color:#6A7684;margin:0 0 24px">${body}</p>
    <a href="/" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#2DA174;color:#fff;font-weight:bold;text-decoration:none">Back to home</a>
  </div>
</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
