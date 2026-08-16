import Link from 'next/link'
import { ClockIcon, MapPinIcon, ImageIcon } from '@/components/icons'
import { ageLabel, formatEventWhen, priceLabel, spotsLabel } from '@/lib/events/format'
import type { EventItem } from '@/lib/events/types'

/**
 * One event, responsive: on phones the image sits on the left of the row; from
 * `lg` up the card stacks with the image on top. Same image either way — only
 * its placement changes with screen size. When `href` is given the whole card is
 * a link to the event-details screen; the description is clamped since the full
 * text lives there.
 */
export function EventCard({ event, href }: { event: EventItem; href?: string }) {
  const clickable = !!href
  const cardClass = `flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] lg:flex-col ${
    clickable
      ? 'cursor-pointer transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]'
      : ''
  }`

  const inner = (
    <>
      {/* Image — left on phones, top on large screens */}
      <div className="relative w-2/5 shrink-0 self-stretch bg-[var(--color-sand)] lg:w-full lg:self-auto lg:aspect-[16/9]">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-32 w-full items-center justify-center text-[var(--color-text-muted)]">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 font-bold leading-snug text-[var(--color-secondary)]">{event.title}</h3>
          <p className="line-clamp-3 text-sm text-[var(--color-text-muted)]">{event.description}</p>
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            {formatEventWhen(event.startsAt, event.endsAt)}
          </span>
          <span className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            {event.location}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--color-border-input)] px-3 py-1 text-sm font-semibold text-[var(--color-text)]">
            {ageLabel(event.ageMin, event.ageMax)}
          </span>
          <PricePill price={event.price} />
          {event.spotsLeft != null && <SpotsTag spotsLeft={event.spotsLeft} />}
        </div>
      </div>
    </>
  )

  return href ? (
    <Link href={href} className={cardClass}>{inner}</Link>
  ) : (
    <article className={cardClass}>{inner}</article>
  )
}

/** Availability: a blue "N spots left" chip, or a muted "Fully booked" one. */
function SpotsTag({ spotsLeft }: { spotsLeft: number }) {
  if (spotsLeft <= 0) {
    return (
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-[var(--color-text-muted)]"
        style={{ backgroundColor: 'var(--color-sand)' }}
      >
        Fully booked
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-[var(--color-secondary)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 14%, white)' }}
    >
      {spotsLabel(spotsLeft)}
    </span>
  )
}

/** Free events get a warm filled chip; paid events an outlined price chip. */
function PricePill({ price }: { price: number }) {
  if (price > 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--color-border-input)] px-3 py-1 text-sm font-semibold text-[var(--color-text)]">
        {priceLabel(price)}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-[var(--color-text)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-tangerine) 20%, white)' }}
    >
      Free
    </span>
  )
}
