'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Guards the public landing screen: a visitor with an active session should never
 * see the marketing hero/carousel — they're sent straight to their logged-in home
 * (the Events page). Until the session check resolves we render nothing, so a
 * logged-in user never even flashes the landing content.
 */
export default function LandingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let alive = true
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!alive) return
        if (session) {
          router.replace('/events')
          return
        }
        setChecked(true)
      })
    return () => {
      alive = false
    }
  }, [router])

  if (!checked) return null
  return <>{children}</>
}
