'use client'

/** Shown after a successful registration. Generic — the family isn't logged in and
 *  just waits for admin approval. */
export default function SignupConfirmation() {
  return (
    <div className="text-center py-6">
      <div
        className="mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full border-2 border-dashed border-[var(--color-border-input)]"
        style={{ backgroundColor: 'var(--color-success-icon-bg)' }}
      >
        <span className="text-3xl" aria-hidden>✓</span>
      </div>

      <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3">Thanks for joining!</h3>

      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        Our team reviews every new family manually.
        <br />
        We&apos;ll email you once your account has been approved.
      </p>
    </div>
  )
}
