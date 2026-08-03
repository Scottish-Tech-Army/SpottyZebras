'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Pins the browser / hardware back button on this screen to `target`, regardless
 * of how the user arrived.
 *
 * How: on mount we push a duplicate history entry (a "sentinel"). The next back
 * press pops that sentinel and fires `popstate`, where we redirect to `target`
 * instead of letting the browser leave to whatever was behind.
 *
 * Only use this on terminal screens with no internal history-based navigation of
 * their own (it would fight ?query-driven step nav). Pass `enabled: false` to
 * skip arming it — e.g. while a screen decides whether the visitor is legitimate.
 */
export function useBackRedirect(target: string, enabled = true) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return
    window.history.pushState(null, '', window.location.href)

    const onPopState = () => {
      router.replace(target)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [router, target, enabled])
}
