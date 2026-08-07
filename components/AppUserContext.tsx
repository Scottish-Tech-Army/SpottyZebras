'use client'

import { createContext, useContext } from 'react'

/**
 * The app-shell chrome state, resolved once by AppShell and shared with every page.
 * `loggedIn` is false only on the public donation screen (anonymous donor); all
 * other app routes require a logged-in user, so there `loggedIn` is always true.
 */
export interface AppChrome {
  loggedIn: boolean
  role: 'admin' | 'parent' | null
  fullName: string | null
}

const AppChromeCtx = createContext<AppChrome | null>(null)

export const AppChromeProvider = AppChromeCtx.Provider

export function useAppChrome(): AppChrome {
  const value = useContext(AppChromeCtx)
  if (!value) throw new Error('useAppChrome must be used inside the app shell')
  return value
}
