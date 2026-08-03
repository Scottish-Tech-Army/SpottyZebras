import Link from 'next/link'
import Header from '@/components/Header'
import { Card } from '@/components/ui/Card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="p-8 w-full max-w-lg text-center">
          <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Page not found</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-8">
            Sorry, we couldn&apos;t find the page you were looking for.
          </p>
          <Link
            href="/"
            className="btn-primary inline-block px-6 py-2.5 rounded-[var(--radius-md)] font-semibold transition"
          >
            Back to home
          </Link>
        </Card>
      </div>
    </div>
  )
}
