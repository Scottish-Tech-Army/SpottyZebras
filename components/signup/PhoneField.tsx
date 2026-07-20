'use client'

import { TextField } from '@/components/ui/TextField'

// Every phone field in the sign-up form behaves identically: a fixed, non-editable
// "+44" prefix, tel keyboard, and national-number placeholder. Kept in one place
// so the country-code decision lives here, not scattered across each field.
export default function PhoneField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  hint?: string
}) {
  return (
    <TextField
      label={label}
      type="tel"
      prefix="+44"
      placeholder="7123 456789"
      autoComplete="tel"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      hint={hint}
    />
  )
}
