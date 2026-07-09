'use client'

import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import Stepper from '@/components/signup/Stepper'
import CarerFields from '@/components/signup/CarerFields'
import PhoneField from '@/components/signup/PhoneField'
import { useSignup } from '@/hooks/useSignup'

export default function SignupPage() {
  const s = useSignup()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="p-8 w-full max-w-lg">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute left-0">
              <BackButton />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Create account</h2>
          </div>

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
                  onClick={() => s.setStep(2)}
                  disabled={!s.step1Valid}
                  className="btn-primary px-6 py-2.5 rounded-[var(--radius-md)] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {s.step === 2 && (
            <div className="text-center text-[var(--color-text-muted)] py-10">
              {/* TODO: Children details (up to 5) */}
              Children — coming next.
            </div>
          )}

          {s.step === 3 && (
            <div className="text-center text-[var(--color-text-muted)] py-10">
              {/* TODO: Account details + submit for admin approval */}
              Account — coming next.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
