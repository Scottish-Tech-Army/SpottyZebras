'use client'

import Link from 'next/link'
import { useAppChrome } from '@/components/AppUserContext'
import { PlusIcon } from '@/components/icons'

/**
 * The Events screen title row. Admins also get a "New Event" action on the right;
 * parents just see the title. Reads the role from the app-shell chrome.
 */
export default function EventsHeader() {
  const { role } = useAppChrome()

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Events</h1>

      {role === 'admin' && (
        <Link
          href="/events/new"
          className="btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
        >
          <PlusIcon className="h-4 w-4" />
          New Event
        </Link>
      )}
    </div>
  )
}
