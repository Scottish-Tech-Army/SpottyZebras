import Header from '@/components/Header'
import { Card } from '@/components/ui/Card'
import { verifyReviewToken } from '@/lib/admin/reviewToken'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
// Never cache — this reflects live DB state (pending / approved / removed).
export const dynamic = 'force-dynamic'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="p-6 sm:p-8 w-full max-w-lg">{children}</Card>
      </div>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h2 className="text-2xl font-bold text-[var(--color-text)] mb-3">{title}</h2>
      <p className="text-sm text-[var(--color-text-muted)]">{body}</p>
    </>
  )
}

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  const verified = verifyReviewToken(token)
  if (!verified) {
    return (
      <Shell>
        <Notice
          title="Link expired or invalid"
          body="This approval link can't be used. It may have already been actioned, or it may be more than 14 days old. Ask the family to register again if needed."
        />
      </Shell>
    )
  }

  const admin = createAdminClient()

  const { data: user } = await admin
    .from('app_user')
    .select('is_active')
    .eq('id', verified.uid)
    .maybeSingle()

  // Rejected families are hard-deleted, so a missing row means "already removed".
  if (!user) {
    return (
      <Shell>
        <Notice
          title="Registration already removed"
          body="This family's registration is no longer in the system. It looks like it was already rejected."
        />
      </Shell>
    )
  }

  const alreadyApproved = user.is_active

  return (
    <Shell>
      <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Review registration</h2>

      {/* The mutation happens ONLY on submit here (a real POST) — an email scanner
          that prefetched the review link changes nothing. */}
      <form method="post" action="/api/admin/review" className="flex items-center gap-3">
        <input type="hidden" name="token" value={token} />
        {!alreadyApproved && (
          <button
            type="submit"
            name="action"
            value="approve"
            className="btn-primary flex-1 px-6 py-2.5 rounded-[var(--radius-md)] font-semibold transition"
          >
            Approve
          </button>
        )}
        <button
          type="submit"
          name="action"
          value="reject"
          className="flex-1 px-6 py-2.5 rounded-[var(--radius-md)] font-semibold text-white transition"
          style={{ backgroundColor: 'var(--color-error)' }}
        >
          {alreadyApproved ? 'Reject & delete' : 'Reject'}
        </button>
      </form>

      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        Approving activates the family&apos;s account; rejecting permanently deletes their registration. This can&apos;t be undone.
      </p>
    </Shell>
  )
}
