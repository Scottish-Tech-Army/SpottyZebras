import Link from 'next/link'
import Header from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header>
        <nav className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white/80 text-slate-700 font-medium hover:bg-white transition"
          >
            Login
          </Link>
          <Link
            href="/donate"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Donation
          </Link>
        </nav>
      </Header>
    </div>
  )
}
