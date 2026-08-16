'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ComponentType } from 'react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase'
import { AppChromeProvider, type AppChrome } from '@/components/AppUserContext'
import {
  CalendarDaysIcon, UsersIcon, TicketIcon, HeartIcon, CircleHelpIcon, UserIcon,
} from '@/components/icons'

type Role = 'admin' | 'parent'
type IconType = ComponentType<{ className?: string }>
interface NavItem { label: string; href: string; Icon: IconType }

// Donate + Help are shared; the middle item differs by role.
const TAIL: NavItem[] = [
  { label: 'Donate', href: '/donate', Icon: HeartIcon },
  { label: 'Help', href: '/help', Icon: CircleHelpIcon },
]

function itemsForRole(role: Role): NavItem[] {
  const events: NavItem = { label: 'Events', href: '/events', Icon: CalendarDaysIcon }
  const roleItem: NavItem =
    role === 'admin'
      ? { label: 'Attendees', href: '/attendees', Icon: UsersIcon }
      : { label: 'My bookings', href: '/bookings', Icon: TicketIcon }
  return [events, roleItem, ...TAIL]
}

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

// Donation is the only route an anonymous visitor may see; everything else requires login.
const isPublicPath = (pathname: string) => pathname === '/donate' || pathname.startsWith('/donate/')

/**
 * The single, persistent shell for every authenticated app route (Events,
 * Attendees / My bookings, Donate, Help). Because it lives in the `(main)` layout,
 * switching tabs swaps only the inner page — the menu stays mounted and is not
 * re-fetched. Donation is included so it keeps the menu too; when reached by an
 * anonymous visitor it renders as a plain standalone screen instead.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [chrome, setChrome] = useState<AppChrome | null>(null)

  // Resolve auth once, on mount — NOT per navigation, so tab switches don't refetch.
  useEffect(() => {
    let alive = true
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        if (alive) setChrome({ loggedIn: false, role: null, fullName: null })
        return
      }

      // The browser can't read app_user directly (RLS); the server verifies the
      // token and returns role / is_active / name with the service-role client.
      const res = await fetch('/api/account-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const status = await res.json().catch(() => ({}))
      if (!alive) return
      if (!status.active) { router.replace('/login'); return }
      setChrome({
        loggedIn: true,
        role: status.role === 'admin' ? 'admin' : 'parent',
        fullName: status.fullName ?? null,
      })
    }
    load()
    return () => { alive = false }
  }, [router])

  // An anonymous visitor may only be on a public (donation) route; bounce them off
  // anything else. Reacts to route changes without re-running the auth fetch above.
  useEffect(() => {
    if (chrome && !chrome.loggedIn && !isPublicPath(pathname)) {
      router.replace('/login')
    }
  }, [chrome, pathname, router])

  // Until auth resolves, render the header chrome only (avoids a wrong-menu flash).
  if (!chrome) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1" />
      </div>
    )
  }

  // Anonymous donor → plain standalone screen (no nav). Pages show their own back button.
  if (!chrome.loggedIn) {
    return (
      <AppChromeProvider value={chrome}>
        <div className="min-h-screen flex flex-col">
          <Header homeHref="/" />
          {children}
        </div>
      </AppChromeProvider>
    )
  }

  const items = itemsForRole(chrome.role ?? 'parent')

  return (
    <AppChromeProvider value={chrome}>
      <div className="min-h-screen flex flex-col">
        <Header homeHref="/events">
          <AccountButton />
        </Header>

        <div className="flex flex-1">
          {/* Sidebar — lg and up */}
          <aside className="hidden lg:flex flex-col gap-1 w-60 shrink-0 bg-white border-r border-[var(--color-border)] p-4">
            {items.map(item => (
              <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </aside>

          {/* Main — leaves room for the fixed bottom bar on small screens */}
          <main className="flex-1 min-w-0 pb-24 lg:pb-0">{children}</main>
        </div>

        {/* Bottom bar — below lg */}
        <nav className="lg:hidden fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around bg-white border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]">
          {items.map(item => (
            <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
      </div>
    </AppChromeProvider>
  )
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon, label, href } = item
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-md)] font-semibold transition ${
        active
          ? 'bg-[var(--color-success-icon-bg)] text-[var(--color-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-sand)]'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  )
}

/** Circular account avatar in the header; opens the Account screen. A person icon
 *  (not initials) so it reads instantly as "your account". Blue = a utility control,
 *  distinct from the primary-green CTAs. */
function AccountButton() {
  return (
    <Link
      href="/account"
      aria-label="Account"
      title="Account"
      className="flex items-center justify-center w-10 h-10 rounded-full text-white shrink-0 transition hover:opacity-90"
      style={{ backgroundColor: 'var(--color-secondary)' }}
    >
      <UserIcon className="w-5 h-5" />
    </Link>
  )
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon, label, href } = item
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold ${
        active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
      }`}
    >
      <span
        className={`flex items-center justify-center w-11 h-8 rounded-full ${
          active ? 'bg-[var(--color-success-icon-bg)]' : ''
        }`}
      >
        <Icon className="w-5 h-5" />
      </span>
      {label}
    </Link>
  )
}
