'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ChevronLeftIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase'

// ─── Shapes the screen renders. The API layer (built next) will return these. ──
interface CarerInfo { name: string; email: string; phone: string; address: string }
interface EmergencyInfo { name: string; phone: string }
interface ChildInfo { name: string; age: number; specialNeeds: string; allergies: string; photoConsent: boolean }
interface ParentAccount {
  carer1: CarerInfo
  carer2: CarerInfo | null
  emergency: EmergencyInfo
  children: ChildInfo[]
}

// TODO: replace with a fetch to the parent account API once that's built.
const PLACEHOLDER: ParentAccount = {
  carer1: { name: 'Emma Holland', email: 'emma@example.com', phone: '07700 900001', address: '12 Test Street, Glasgow, G1 2AB' },
  carer2: { name: 'James Holland', email: 'james@example.com', phone: '07700 900002', address: '12 Test Street, Glasgow, G1 2AB' },
  emergency: { name: 'Priya Shah', phone: '07700 900003' },
  children: [
    { name: 'Aaliyah', age: 7, specialNeeds: 'Autism', allergies: 'Peanuts', photoConsent: true },
    { name: 'Idris', age: 4, specialNeeds: '', allergies: '', photoConsent: false },
  ],
}

// On wide screens, an item alone on the final row (odd count) is centred.
const CENTER_ODD = 'lg:col-span-2 lg:w-1/2 lg:mx-auto'

interface Identity { role: 'admin' | 'parent'; name: string; email: string }

export default function AccountPage() {
  const router = useRouter()
  const [me, setMe] = useState<Identity | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const res = await fetch('/api/account-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const status = await res.json().catch(() => ({}))
      if (!alive) return
      setMe({
        role: status.role === 'admin' ? 'admin' : 'parent',
        name: status.fullName ?? '',
        email: session.user.email ?? '',
      })
    }
    load()
    return () => { alive = false }
  }, [router])

  async function handleSignOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.replace('/login')
  }

  if (!me) return <div className="min-h-screen" />

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal header: back + title (left), prominent Sign out button (right) */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-white/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="-ml-1 p-1 rounded-[var(--radius-sm)] text-[var(--color-text)] hover:bg-[var(--color-sand)] transition"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Account</h1>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="rounded-[var(--radius-md)] border border-[var(--color-error)] px-4 py-1.5 text-sm font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-sand)]"
        >
          Sign out
        </button>
      </header>

      <div className="flex-1 flex justify-center px-4 py-6">
        <div className="w-full max-w-lg lg:max-w-3xl flex flex-col gap-5">
          {me.role === 'admin' ? (
            <AdminView name={me.name} email={me.email} />
          ) : (
            <ParentView data={PLACEHOLDER} />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        message="You'll need to sign in again to get back into your account."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        danger
        busy={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

// ─── Admin: just the account name + email ──────────────────────────────────
function AdminView({ name, email }: { name: string; email: string }) {
  return (
    <Card className="p-6">
      <SectionLabel>Account</SectionLabel>
      <div className="pt-2">
        <Row label="Name" value={name} />
        <Row label="Email" value={email} />
      </div>
    </Card>
  )
}

// ─── Parent: carers + emergency, then children ─────────────────────────────
function ParentView({ data }: { data: ParentAccount }) {
  return (
    <>
      <Card className="p-6">
        <SectionLabel>Parent / carer</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
          <SubSection title="Parent / carer 1">
            <Row label="Name" value={data.carer1.name} />
            <Row label="Email" value={data.carer1.email} />
            <Row label="Phone" value={data.carer1.phone} />
            <Row label="Address" value={data.carer1.address} />
          </SubSection>

          {data.carer2 && (
            <SubSection title="Parent / carer 2">
              <Row label="Name" value={data.carer2.name} />
              <Row label="Email" value={data.carer2.email} />
              <Row label="Phone" value={data.carer2.phone} />
              <Row label="Address" value={data.carer2.address} />
            </SubSection>
          )}

          {/* With a carer 2 there are 3 sub-sections, so emergency lands alone on
              the last row → centre it on wide screens. */}
          <SubSection title="Emergency contact" className={data.carer2 ? CENTER_ODD : ''}>
            <Row label="Name" value={data.emergency.name} />
            <Row label="Phone" value={data.emergency.phone} />
          </SubSection>
        </div>
      </Card>

      <Card className="p-6">
        <SectionLabel>Children</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
          {data.children.map((child, i) => {
            const lastAndOdd = i === data.children.length - 1 && data.children.length % 2 === 1
            return (
              <SubSection key={i} title={`${child.name} · Age ${child.age}`} className={lastAndOdd ? CENTER_ODD : ''}>
                <Row label="Special needs" value={child.specialNeeds} />
                <Row label="Allergies" value={child.allergies} />
                <Row label="Photo consent" value={child.photoConsent ? 'Yes' : 'No'} />
              </SubSection>
            )
          })}
        </div>
      </Card>
    </>
  )
}

// ─── Small presentational helpers ──────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)] mb-2">
      {children}
    </p>
  )
}

/** Each sub-section is divided by a top rule, which works in both the single-column
 *  (phone) and two-column (large screen) layouts. */
function SubSection({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`pt-4 mt-4 border-t border-[var(--color-border)] ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
        {title}
      </p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-1.5">
      <span className="w-28 sm:w-32 shrink-0 text-sm font-bold text-[var(--color-text)]">{label}</span>
      <span className="text-sm text-[var(--color-text-secondary)] break-words min-w-0">{value || '—'}</span>
    </div>
  )
}
