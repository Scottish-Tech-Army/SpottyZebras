'use client'

import { useRouter } from 'next/navigation'

export default function BackButton({ href }: { href?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => href ? router.push(href) : router.back()}
      className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-medium flex items-center gap-1"
    >
      ← Back
    </button>
  )
}
