'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import PasswordVisibilityToggle from '@/components/ui/PasswordVisibilityToggle'
import { createClient } from '@/lib/supabase'
import { passwordChecks, isPasswordValid } from '@/lib/signup/validation'

type Status = 'verifying' | 'ready' | 'invalid' | 'done'

function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const tokenHash = params.get('token_hash')
  const type = params.get('type')

  const [status, setStatus] = useState<Status>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Exchange the emailed token for a short-lived recovery session on mount.
  useEffect(() => {
    if (!tokenHash || type !== 'recovery') { setStatus('invalid'); return }
    let alive = true
    createClient()
      .auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
      .then(({ error }) => { if (alive) setStatus(error ? 'invalid' : 'ready') })
      .catch(() => { if (alive) setStatus('invalid') })
    return () => { alive = false }
  }, [tokenHash, type])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isPasswordValid(password)) { setError('Please choose a password that meets the requirements below.'); return }
    if (password !== confirm) { setError('The passwords don’t match.'); return }

    setError('')
    setSaving(true)
    try {
      const supabase = createClient()
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) { setError(updErr.message ?? 'Could not update your password. Please try again.'); return }
      // Don't leave the recovery session usable — force a fresh sign-in.
      await supabase.auth.signOut()
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const checks = passwordChecks(password)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-center">
            <h2 className="text-2xl font-bold text-[var(--color-secondary)]">Reset password</h2>
          </div>

          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
              <p className="text-sm text-[var(--color-text-muted)]">Verifying your link…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="mt-4 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/forgot-password" className="mt-2 text-sm font-bold text-[var(--color-secondary)] underline">
                Request a new link
              </Link>
            </div>
          )}

          {status === 'done' && (
            <div className="mt-4 flex flex-col items-center gap-3 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-[var(--color-primary)]"
                style={{ backgroundColor: 'var(--color-success-icon-bg)' }}
              >
                ✓
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Your password has been updated. You can now sign in with it.
              </p>
              <Link href="/login" className="btn-primary mt-2 w-full rounded-[var(--radius-md)] py-2.5 text-center text-sm font-semibold">
                Go to login
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <>
              <p className="mb-6 text-center text-sm text-[var(--color-text-muted)]">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                    New password <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                      disabled={saving}
                      autoComplete="new-password"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-input)] bg-white px-3 py-2 pr-10 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-60"
                    />
                    <PasswordVisibilityToggle revealed={show} onToggle={() => setShow(v => !v)} disabled={saving} />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                    Confirm new password <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="confirm"
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); if (error) setError('') }}
                    disabled={saving}
                    autoComplete="new-password"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-input)] bg-white px-3 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-60"
                  />
                </div>

                {/* Live requirements checklist (same rules as sign-up). */}
                <ul className="space-y-1">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-xs">
                      <span className={c.met ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}>
                        {c.met ? '✓' : '○'}
                      </span>
                      <span className={c.met ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'}>
                        {c.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full rounded-[var(--radius-md)] py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}
