'use client'

import { useAppChrome } from '@/components/AppUserContext'

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function EventsPage() {
  const { fullName } = useAppChrome()
  const firstName = fullName?.trim().split(' ')[0] ?? 'there'

  return (
    <div className="p-6 sm:p-10">
      <p className="text-lg font-semibold text-[var(--color-secondary)]">{timeGreeting()},</p>
      <h1 className="text-3xl font-bold text-[var(--color-text)]">{firstName} 👋</h1>
      <p className="mt-3 text-[var(--color-text-muted)]">Upcoming events will appear here.</p>
    </div>
  )
}
