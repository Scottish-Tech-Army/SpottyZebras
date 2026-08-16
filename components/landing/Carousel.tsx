'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Patrick_Hand } from 'next/font/google'
import { ImageIcon } from '@/components/icons'

// Playful hand-drawn brand font (self-hosted by next/font).
const brandFont = Patrick_Hand({ weight: '400', subsets: ['latin'] })

export interface CarouselSlide {
  caption: string
  /** Photo URL; falls back to a neutral placeholder when absent. */
  imageUrl?: string
}

const AUTO_MS = 5000
// The carousel column is roughly this wide at each breakpoint — lets next/image
// serve an appropriately sized file instead of the full-resolution original.
const IMG_SIZES = '(min-width: 1024px) 550px, (min-width: 640px) 576px, 100vw'

/**
 * Rotating hero carousel for the landing page. Auto-advances every 5s, pauses on
 * hover/focus and when the tab is hidden, and honours `prefers-reduced-motion`
 * (no auto-advance, no fade). The photo shows in full (never cropped); the fact
 * sits inside the same white card beneath it. Dots below jump to a slide.
 */
export default function Carousel({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const count = slides.length

  // Auto-advance (unless paused, reduced-motion, or a single slide).
  useEffect(() => {
    if (count <= 1 || paused || reduced) return
    const id = setInterval(() => setIndex(i => (i + 1) % count), AUTO_MS)
    return () => clearInterval(id)
  }, [count, paused, reduced])

  // Pause while the tab is in the background.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const active = slides[index]

  return (
    <div
      className="flex flex-col gap-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]"
        role="group"
        aria-roledescription="carousel"
        aria-label="Spotty Zebras highlights"
      >
        {/* Photo — 3:2 frame (matches the source images), shown in full (object-contain) */}
        <div className="relative aspect-[3/2] w-full bg-white">
          {slides.map((slide, i) => (
            // Eager-load only the first (above-the-fold) photo — it's the LCP.
            <Slide key={i} slide={slide} active={i === index} reduced={reduced} priority={i === 0} />
          ))}
        </div>

        {/* Fact — part of the card: title (green) + description (blue, smaller) */}
        <div className="border-t border-[var(--color-border)] px-4 py-3 sm:px-5 sm:py-4">
          <Fact caption={active.caption} />
        </div>
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1} of ${count}`}
              aria-current={i === index}
              className="h-3 w-3 rounded-full border-2 transition-colors"
              style={{
                borderColor: 'var(--color-primary)',
                backgroundColor: i === index ? 'var(--color-primary)' : 'transparent',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Splits a fact at the first ":" into a green title and a smaller blue description. */
function Fact({ caption }: { caption: string }) {
  const idx = caption.indexOf(':')
  const title = (idx === -1 ? caption : caption.slice(0, idx)).trim()
  const description = idx === -1 ? '' : caption.slice(idx + 1).trim()
  return (
    <div className={`${brandFont.className} text-center`}>
      <h1 className={`${brandFont.className} text-2xl text-[var(--color-secondary)]`}>{title}</h1>
      {description && (
        <p className="mt-1.5 text-sm leading-snug text-[var(--color-text-secondary)] sm:text-base">{description}</p>
      )}
    </div>
  )
}

function Slide({ slide, active, reduced, priority }: { slide: CarouselSlide; active: boolean; reduced: boolean; priority?: boolean }) {
  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'} ${
        reduced ? '' : 'transition-opacity duration-700'
      }`}
    >
      {slide.imageUrl ? (
        <Image src={slide.imageUrl} alt="" fill sizes={IMG_SIZES} priority={priority} className="object-contain" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
          <ImageIcon className="h-12 w-12 opacity-50" />
        </div>
      )}
    </div>
  )
}

/** True when the user has asked for reduced motion; updates if they change it. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}
