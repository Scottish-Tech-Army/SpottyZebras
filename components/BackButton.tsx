'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@/components/icons'

export default function BackButton({ href }: { href?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      aria-label="Back"
      className="-ml-1 p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-sand)] transition"
    >
      <ArrowLeftIcon className="w-6 h-6" />
    </button>
  )
}
