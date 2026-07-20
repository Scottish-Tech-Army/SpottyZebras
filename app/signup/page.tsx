'use client'

import { Suspense } from 'react'
import Header from '@/components/Header'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import Stepper from '@/components/signup/Stepper'
import CarerFields from '@/components/signup/CarerFields'
import ChildCard from '@/components/signup/ChildCard'
import PhoneField from '@/components/signup/PhoneField'
import PasswordField from '@/components/signup/PasswordField'
import SelectField from '@/components/signup/SelectField'
import { REFERRAL_OPTIONS } from '@/lib/signup/constants'
import { useSignup } from '@/hooks/useSignup'

// useSignup() reads ?step=N via useSearchParams, which Next requires to sit inside
// a Suspense boundary during prerender.
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SignupWizard />
    </Suspense>
  )
}

function SignupWizard() {
  const s = useSignup()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="p-8 w-full max-w-lg">
          <div className="flex items-center justify-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Create account</h2>
          </div>

          {/* Until the draft is restored, don't flash step 1 for someone deep-linked
              to a later step — show nothing rather than the wrong step. */}
          {!s.hydrated ? (
            <div className="py-16" />
          ) : (
          <>
          <Stepper current={s.step} />

          {s.step === 1 && (
            <div className="flex flex-col gap-8">
              <h3 className="text-2xl font-bold text-[var(--color-text)] -mb-2">About you</h3>

              {/* First parent / carer */}
              <CarerFields
                carer={s.carer1}
                errors={s.carer1Errors}
                onChange={s.updateCarer1}
                onBlur={s.touchCarer1}
                required={s.carer1Required}
              />

              {/* Optional second parent / carer */}
              {!s.showCarer2 ? (
                <button
                  type="button"
                  onClick={s.addCarer2}
                  className="w-full py-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-input)] text-sm font-medium text-[var(--color-secondary)] hover:bg-[var(--color-sand)] transition"
                >
                  + Add a second parent / carer
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Second parent / carer
                    </p>
                    <button
                      type="button"
                      onClick={s.removeCarer2}
                      className="text-xs font-medium text-[var(--color-secondary)] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <CarerFields
                    carer={s.carer2}
                    errors={s.carer2Errors}
                    onChange={s.updateCarer2}
                    onBlur={s.touchCarer2}
                    required={s.carer2Required}
                  />
                </div>
              )}

              {/* Emergency contact */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                  Emergency contact
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  Must be someone other than the carers above.
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <TextField
                      label="Full name *"
                      value={s.emergencyName}
                      onChange={s.setEmergencyName}
                      onBlur={() => s.touchEmergency('name')}
                      error={s.emergencyErrors.name}
                    />
                    {s.emergencyNameWarning && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-accent-tangerine)' }}>
                        ⚠ {s.emergencyNameWarning}
                      </p>
                    )}
                  </div>
                  <PhoneField
                    label="Contact number *"
                    value={s.emergencyPhone}
                    onChange={s.setEmergencyPhone}
                    onBlur={() => s.touchEmergency('phone')}
                    error={s.emergencyErrors.phone}
                  />
                </div>
              </div>

              <div className="border-t border-dashed border-[var(--color-border)]" />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={s.attemptNext}
                  className="btn-primary px-6 py-2.5 rounded-[var(--radius-md)] font-semibold transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {s.step === 2 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-2xl font-bold text-[var(--color-text)]">Children</h3>

              {s.children.map((child, i) => (
                <ChildCard
                  key={i}
                  index={i}
                  child={child}
                  errors={s.childrenErrors[i] ?? {}}
                  onChange={(f, v) => s.updateChild(i, f, v)}
                  onBlur={f => s.touchChild(i, f)}
                  onToggleSameAddress={checked => s.toggleChildSameAddress(i, checked)}
                  onTogglePhotoConsent={checked => s.toggleChildPhotoConsent(i, checked)}
                  onRemove={i > 0 ? () => s.removeChild(i) : undefined}
                />
              ))}

              {s.canAddChild && (
                <button
                  type="button"
                  onClick={s.addChild}
                  className="self-start px-5 py-2.5 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-ink)] text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-sand)] transition"
                >
                  + Add another child
                </button>
              )}

              {/* Form-level rule: at least one child needs support needs recorded. */}
              {s.supportNeedsError && (
                <p className="text-sm text-[var(--color-error)]">{s.supportNeedsError}</p>
              )}

              <div className="border-t border-dashed border-[var(--color-border)]" />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={s.back}
                  className="px-6 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-input)] font-semibold text-[var(--color-text)] hover:bg-[var(--color-sand)] transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={s.attemptNext}
                  className="btn-primary px-6 py-2.5 rounded-[var(--radius-md)] font-semibold transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {s.step === 3 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-2xl font-bold text-[var(--color-text)]">Account</h3>

              <div>
                <PasswordField
                  label="Password *"
                  value={s.password}
                  onChange={s.setPassword}
                  onBlur={() => s.setPasswordTouched(true)}
                />
                {s.passwordError && (
                  <p className="mt-1 text-xs text-[var(--color-error)]">{s.passwordError}</p>
                )}
              </div>

              <SelectField
                label="How did you hear about us?"
                value={s.referralSource}
                onChange={s.setReferralSource}
                options={REFERRAL_OPTIONS}
                placeholder=""
              />

              {/* Consent — mandatory */}
              <label className="flex items-start gap-3 cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
                <input
                  type="checkbox"
                  checked={s.agreedToTerms}
                  onChange={e => s.setAgreedToTerms(e.target.checked)}
                  className="giftaid-check mt-0.5 h-4 w-4 rounded border-[var(--color-border-input)]"
                />
                <span className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  I agree to the{' '}
                  <a className="text-[var(--color-secondary)] underline cursor-pointer">Terms</a> and{' '}
                  <a className="text-[var(--color-secondary)] underline cursor-pointer">Privacy Policy</a>,
                  and consent to Spotty Zebras processing my child&apos;s information.
                </span>
              </label>

              <div className="border-t border-dashed border-[var(--color-border)]" />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={s.back}
                  className="px-6 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-input)] font-semibold text-[var(--color-text)] hover:bg-[var(--color-sand)] transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={s.submit}
                  disabled={!s.canSubmit}
                  className="btn-primary px-6 py-2.5 rounded-[var(--radius-md)] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create account
                </button>
              </div>

              <div
                className="flex items-center gap-3 rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed"
                style={{
                  backgroundColor: 'var(--color-gift-aid-bg)',
                  borderColor: 'var(--color-gift-aid-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span aria-hidden className="text-lg leading-none shrink-0">⚠️</span>
                <span>
                  <strong className="text-[var(--color-text)]">After you submit, our team will review your registration form. Your account will be
                  activated on approval.</strong>
                </span>
              </div>
            </div>
          )}
          </>
          )}
        </Card>
      </div>
    </div>
  )
}
