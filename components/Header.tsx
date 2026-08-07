import Image from 'next/image'
import { Patrick_Hand } from 'next/font/google'

// Playful hand-drawn brand font, self-hosted by next/font (no runtime request).
const brandFont = Patrick_Hand({ weight: '400', subsets: ['latin'] })

export default function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-3 bg-white/60 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Spotty Zebras SCIO logo"
          width={1103}
          height={739}
          className="h-12 w-auto object-contain"
          priority
        />
        <div className={`${brandFont.className} flex flex-col leading-tight`}>
          <span className="text-xl sm:text-2xl lg:text-3xl text-[var(--color-primary)]">
            Spotty Zebras SCIO
          </span>
          <span className="text-xs sm:text-sm lg:text-base text-[var(--color-secondary)]">
            Where being different is fun!
          </span>
        </div>
      </div>
      {children}
    </header>
  )
}
