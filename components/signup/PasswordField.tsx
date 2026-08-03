'use client'

import { useState } from 'react'
import { passwordChecks } from '@/lib/signup/validation'
import { PASSWORD_MIN } from '@/lib/signup/constants'
import PasswordVisibilityToggle from '@/components/ui/PasswordVisibilityToggle'

/**
 * Password field with a live requirements checklist. Each rule turns green as it's
 * met, so the parent gets continuous guidance rather than an error only on submit.
 */
export default function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  showChecklist = true,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  showChecklist?: boolean
}) {
  const rules = passwordChecks(value)
  const [revealed, setRevealed] = useState(false)

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
      <div className="relative">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={`At least ${PASSWORD_MIN} characters`}
          autoComplete="new-password"
          className="w-full px-3 py-2 pr-10 border rounded-[var(--radius-sm)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm text-[var(--color-text)] border-[var(--color-border-input)]"
        />
        <PasswordVisibilityToggle revealed={revealed} onToggle={() => setRevealed(v => !v)} />
      </div>
      {showChecklist && (
        <ul className="mt-2 flex flex-col gap-1">
          {rules.map(rule => (
            <li
              key={rule.label}
              className="flex items-center gap-2 text-xs"
              style={{ color: rule.met ? 'var(--color-gift-aid-accent)' : 'var(--color-text-muted)' }}
            >
              <span aria-hidden>{rule.met ? '✓' : '○'}</span>
              {rule.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
