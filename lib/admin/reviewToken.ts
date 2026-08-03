import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Signed, expiring tokens for the admin approve/reject email links.
 *
 * The admin isn't logged in when they click a button in the email — the TOKEN is
 * the authorisation. It's an HMAC of `{ uid, exp }` with a server-only secret, so:
 *   - nobody can forge a link for an arbitrary user (they can't produce the HMAC),
 *   - links stop working after `exp` (a stale inbox can't approve months later).
 *
 * The token deliberately does NOT bake in the action. It only grants access to
 * review ONE family; the admin picks approve or reject on the confirmation page.
 * That keeps a single link valid for either outcome and avoids "already approved,
 * then clicked the old reject link" mismatches.
 */

const TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

function secret(): string {
  const s = process.env.ADMIN_ACTION_SECRET
  if (!s) throw new Error('ADMIN_ACTION_SECRET is not set')
  return s
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64url')

const sign = (payload: string) =>
  createHmac('sha256', secret()).update(payload).digest('base64url')

/** Create a token that lets the holder review (and approve/reject) this user. */
export function signReviewToken(uid: string): string {
  const payload = b64url(JSON.stringify({ uid, exp: Date.now() + TTL_MS }))
  return `${payload}.${sign(payload)}`
}

/**
 * Verify a token. Returns the user id if the signature is valid AND unexpired,
 * otherwise null. Never throws on bad input — a garbage token is just invalid.
 */
export function verifyReviewToken(token: string | null | undefined): { uid: string } | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  // Constant-time compare so we don't leak signature bytes through timing.
  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof uid !== 'string' || typeof exp !== 'number') return null
    if (Date.now() > exp) return null
    return { uid }
  } catch {
    return null
  }
}
