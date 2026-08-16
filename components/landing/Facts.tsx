import type { ComponentType } from 'react'
import { Patrick_Hand } from 'next/font/google'
import { UsersIcon, SmileIcon, TicketIcon, HeartIcon } from '@/components/icons'

// Playful hand-drawn brand font (self-hosted by next/font).
const brandFont = Patrick_Hand({ weight: '400', subsets: ['latin'] })

interface Fact {
  Icon: ComponentType<{ className?: string }>
  value: string
  label: string
}

const FACTS: Fact[] = [
  { Icon: UsersIcon,  value: '165+', label: 'families supported' },
  { Icon: SmileIcon,  value: '300+', label: 'kids registered' },
  { Icon: TicketIcon, value: '130+', label: 'events & support sessions' },
  { Icon: HeartIcon,  value: '10',   label: 'volunteers & trustees' },
]

/** Impact stats below the hero — big green numbers with an icon each. The container
 *  shrinks to fit its content and centers on the page. */
export default function Facts() {
  return (
    <div className="mx-auto w-fit rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/70 px-4 py-3 sm:px-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {FACTS.map(({ Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 px-2 text-center">
            <Icon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
            <p className={`${brandFont.className} text-lg font-bold text-[var(--color-primary)] sm:text-xl`}>{value}</p>
            <p className={`${brandFont.className} text-s leading-snug text-[var(--color-text-secondary)]`}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
