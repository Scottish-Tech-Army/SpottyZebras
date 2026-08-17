import type { ComponentType } from 'react'
import { BRAND } from '@/lib/brand'
import { MailIcon, FacebookIcon } from '@/components/icons'

/** A single labelled contact row: icon, a small label, and a value (optionally a link). */
function ContactRow({
  Icon,
  label,
  value,
  href,
}: {
  Icon: ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-icon-bg)] text-[var(--color-primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        {href ? (
          <a href={href} className="text-sm font-bold text-[var(--color-secondary)]">
            {value}
          </a>
        ) : (
          <p className="text-sm font-bold text-[var(--color-secondary)]">{value}</p>
        )}
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-10">
      <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Help</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Have a question or need a hand? Reach the {BRAND.name} team using the details below.
      </p>

      <div className="mt-6 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 sm:p-6">
        <ContactRow Icon={MailIcon} label="Email" value={BRAND.email} href={`mailto:${BRAND.email}`} />
        {BRAND.facebook && (
          <ContactRow
            Icon={FacebookIcon}
            label="Facebook Messenger"
            value="Message us on Facebook"
            href={BRAND.facebook}
          />
        )}
      </div>
    </div>
  )
}
