'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
      } else if (data.user) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-[var(--color-surface)] backdrop-blur-sm rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border border-[var(--color-border)] p-8 w-full max-w-sm">
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute left-0">
              <BackButton />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Welcome back</h2>
          </div>

          <p className="text-center text-sm text-[var(--color-text-muted)] mb-8">
            Sign in to see what&apos;s on this week.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Email <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-[var(--color-border-input)] rounded-[var(--radius-sm)] text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Password <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-[var(--color-border-input)] rounded-[var(--radius-sm)] text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-60"
              />
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-[var(--color-secondary)] hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 font-semibold rounded-[var(--radius-md)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 border-t border-dashed border-[var(--color-border)]" />

          <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
            New here?{' '}
            <Link href="/signup" className="font-bold text-[var(--color-secondary)] underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
