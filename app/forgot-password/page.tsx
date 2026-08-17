'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { isEmail } from '@/lib/signup/validation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = email.trim()

    // Same emptiness + format checks the rest of the app uses.
    if (!value) { setError('Please enter an email.'); return }
    if (!isEmail(value)) { setError('Please enter a valid email.'); return }

    setError('')
    setLoading(true)
    try {
      await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
    } catch {
      // The response is generic anyway; on a network error we still show the same
      // neutral confirmation so the screen never behaves differently per email.
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-center">
            <h2 className="text-2xl font-bold text-[var(--color-secondary)]">Forgot password</h2>
          </div>

          {sent ? (
            <div className="mt-4 flex flex-col items-center gap-3 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-[var(--color-primary)]"
                style={{ backgroundColor: 'var(--color-success-icon-bg)' }}
              >
                ✓
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                You will receive an email if it exists in our system.
              </p>
              <Link
                href="/login"
                className="mt-2 text-sm font-bold text-[var(--color-secondary)] underline"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-8 text-center text-sm text-[var(--color-text-muted)]">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                    Email <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    disabled={loading}
                    placeholder="you@example.com"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-input)] bg-white px-3 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-60"
                  />
                  {error && <p className="mt-1 text-sm text-[var(--color-error)]">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full rounded-[var(--radius-md)] py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Please wait…' : 'Verify email'}
                </button>
              </form>

              <div className="mt-6 border-t border-dashed border-[var(--color-border)]" />

              <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
                Remembered it?{' '}
                <Link href="/login" className="font-bold text-[var(--color-secondary)] underline">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
