import type { ComponentType } from 'react'
import { BRAND } from '@/lib/brand'
import { PhoneIcon, MailIcon, MapPinIcon } from '@/components/icons'

const tel = (phone: string) => `tel:${phone.replace(/\s+/g, '')}`

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
          <a href={href} className="font-bold text-[var(--color-secondary)] text-sm">
            {value}
          </a>
        ) : (
          <p className="font-bold text-[var(--color-secondary)] text-sm">{value}</p>
        )}
      </div>
    </div>
  )
}

export default function HelpPage() {
  const { primary, secondary } = BRAND.contacts

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-10">
      <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Help</h1>

      <div className="mt-6 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 sm:p-6">
        <ContactRow
          Icon={PhoneIcon}
          label={`Primary contact - ${primary.name}`}
          value={primary.phone}
          href={tel(primary.phone)}
        />
        <ContactRow
          Icon={PhoneIcon}
          label={`Secondary contact - ${secondary.name}`}
          value={secondary.phone}
          href={tel(secondary.phone)}
        />
        <ContactRow Icon={MailIcon} label="Email" value={BRAND.email} href={`mailto:${BRAND.email}`} />
        <ContactRow Icon={MapPinIcon} label="Address" value={BRAND.address} />
      </div>
    </div>
  )
}
