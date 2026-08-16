import Image from 'next/image'
import Link from 'next/link'
import { Patrick_Hand } from 'next/font/google'
import { BRAND } from '@/lib/brand'

// Playful hand-drawn brand font, self-hosted by next/font (no runtime request).
const brandFont = Patrick_Hand({ weight: '400', subsets: ['latin'] })

export default function Header({
  children,
  homeHref = '/',
}: {
  children?: React.ReactNode
  /** Where the logo/title links to — the logged-in home (Events) when signed in,
   *  the public landing screen otherwise. */
  homeHref?: string
}) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-3 bg-white/60 backdrop-blur-md shadow-sm">
      <Link href={homeHref} aria-label={`${BRAND.name} home`} className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt={`${BRAND.name} logo`}
          width={1103}
          height={739}
          className="h-12 w-auto object-contain"
          priority
        />
        <div className={`${brandFont.className} flex flex-col leading-tight`}>
          <span className="text-xl sm:text-2xl lg:text-3xl text-[var(--color-primary)]">
            {BRAND.name}
          </span>
          <span className="text-xs sm:text-sm lg:text-base text-[var(--color-secondary)]">
            {BRAND.tagline}
          </span>
        </div>
      </Link>
      {children}
    </header>
  )
}
