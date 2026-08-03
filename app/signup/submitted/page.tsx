'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Card } from '@/components/ui/Card'
import SignupConfirmation from '@/components/signup/SignupConfirmation'
import { useBackRedirect } from '@/hooks/useBackRedirect'
import { SIGNUP_SUBMITTED_FLAG } from '@/lib/signup/constants'

/**
 * Terminal confirmation after a successful registration. It only renders for a
 * visitor who just submitted (a one-shot flag set during submit). Anyone else —
 * a typed/shared URL, a refresh, a random visitor — is sent to Home instead.
 * For the genuine visitor, back is also pinned to Home so the completed, no-longer
 * valid form can't be reached.
 */
export default function SignupSubmittedPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  // Only arm the back-pin once we've confirmed this is a genuine visitor.
  useBackRedirect('/', allowed)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // sessionStorage is client-only, so this check must run after mount.
    const justSubmitted = sessionStorage.getItem(SIGNUP_SUBMITTED_FLAG) === '1'
    if (!justSubmitted) {
      router.replace('/')
      return
    }
    sessionStorage.removeItem(SIGNUP_SUBMITTED_FLAG) // one-shot — a refresh goes Home
    setAllowed(true)
  }, [router])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!allowed) return <div className="min-h-screen" />

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="p-8 w-full max-w-lg">
          <SignupConfirmation />

          <button
            type="button"
            onClick={() => router.push('/')}
            className="btn-primary w-full mt-8 py-2.5 rounded-[var(--radius-md)] font-semibold transition"
          >
            Back to home
          </button>
        </Card>
      </div>
    </div>
  )
}
