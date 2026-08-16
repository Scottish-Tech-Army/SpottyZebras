import Link from 'next/link'
import Image from 'next/image'
import { Patrick_Hand } from 'next/font/google'
import Carousel, { type CarouselSlide } from '@/components/landing/Carousel'
import Facts from '@/components/landing/Facts'
import LandingGate from '@/components/landing/LandingGate'
import { BRAND } from '@/lib/brand'

// Playful hand-drawn brand font (self-hosted by next/font).
const brandFont = Patrick_Hand({ weight: '400', subsets: ['latin'] })

// Hero carousel photos. Captions are placeholders — swap for real ones when ready.
const SLIDES: CarouselSlide[] = [
  { caption: 'Support for the whole family: It is never just about the children - we provide a welcoming space, a listening ear and dedicated support for parents and carers too.', imageUrl: '/onboarding_image1.jpeg' },
  { caption: 'Lived Experience at Every Level: Every single trustee and volunteer brings first-hand, lived experience as a parent or carer supporting a family member with additional support needs.', imageUrl: '/onboarding_image2.jpeg' },
  { caption: 'Inclusive for siblings: All of our events and activities are fully open to siblings, making every meetup a true family outing.', imageUrl: '/onboarding_image3.jpeg' },
]

const FOOTER_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

// Contact details rendered inline in the footer (no separate Contact page).
const CONTACT_LINKS = [
  { label: BRAND.email, href: `mailto:${BRAND.email}` },
  { label: BRAND.phone, href: `tel:${BRAND.phone.replace(/\s+/g, '')}` },
]

export default function Home() {
  return (
    <LandingGate>
    <div className="flex min-h-screen flex-col">
      {/* ── Header: logo + title (left, fixed across sizes), Donate (right) ──── */}
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" aria-label={`${BRAND.name} home`} className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt=""
              width={1103}
              height={739}
              priority
              className="h-9 w-auto shrink-0 object-contain sm:h-10 lg:h-11"
            />
            <span className={`${brandFont.className} whitespace-nowrap text-lg text-[var(--color-primary)] sm:text-2xl lg:text-3xl`}>
              {BRAND.name}
            </span>
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-12 px-4 py-8 sm:px-6 lg:gap-16 lg:py-12">
        <div className="flex flex-col gap-10 md:grid md:grid-cols-2 md:items-center md:gap-12">
          {/* Text — centered on mobile (it sits on top there), left column from tablet up */}
          <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
            {/* Blue tagline as the heading for the intro copy */}
            <div className="max-w-md">
              <h1 className={`${brandFont.className} text-center text-xl text-[var(--color-secondary)] sm:text-3xl lg:text-3xl`}>
                {BRAND.tagline}
              </h1>
              <p className={`${brandFont.className} mt-6 text-justify text-lg leading-snug text-[var(--color-text-secondary)]`}>
                {BRAND.name} is a charity for kids with additional support needs and their families.
                Originally founded in November 2009 we officially became a registered Scottish charity in 2025.
                We run events and activities to support kids, their siblings, parents and carers in a
                friendly and safe environment.
              </p>
            {/* Donate is the highlighted primary CTA; Sign in sits below as a quieter
                outline button of the exact same size and placement. */}
            <Link
              href="/donate"
              className="btn-primary mx-auto mt-6 block w-[60%] max-w-xs rounded-[var(--radius-md)] py-2.5 text-center text-sm font-semibold"
            >
              Donate
            </Link>
            <Link
              href="/login"
              className="mx-auto mt-3 block w-[60%] max-w-xs rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-white py-2.5 text-center text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-sand)]"
            >
              Sign in
            </Link>

            </div>
          </div>

          {/* Carousel — below the text on mobile, right column from tablet up. Sized
              by the smaller of the column width and the viewport height, so it scales
              down (never dominates) as the window shrinks and stays above the fold. */}
          <div className="mx-auto md:order-2" style={{ width: 'min(100%, 32rem, 56vh)' }}>
            <Carousel slides={SLIDES} />
          </div>
        </div>

        {/* Impact stats — full width below both the text and the carousel */}
        <section aria-label="Our impact">
          <Facts />
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-4 text-sm text-[var(--color-text-muted)] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Contact us — email + phone inline, no separate Contact page */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-semibold text-[var(--color-text-secondary)]">Contact us:</span>
            {CONTACT_LINKS.map((l, i) => (
              <span key={l.href} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-[var(--color-border-input)]">·</span>}
                <a href={l.href} className="transition hover:text-[var(--color-text)]">{l.label}</a>
              </span>
            ))}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {FOOTER_LINKS.map((l, i) => (
              <span key={l.href} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-[var(--color-border-input)]">·</span>}
                <Link href={l.href} className="transition hover:text-[var(--color-text)]">{l.label}</Link>
              </span>
            ))}
            <span aria-hidden className="text-[var(--color-border-input)]">·</span>
            <span>Registered SCIO {BRAND.charityNumber}</span>
          </nav>
        </div>
      </footer>
    </div>
    </LandingGate>
  )
}
