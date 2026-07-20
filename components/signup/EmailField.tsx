'use client'

import { TextField } from '@/components/ui/TextField'

// Shared email field config (type, placeholder, autocomplete) — reused wherever
// the form asks for an email so the behaviour stays consistent.
export default function EmailField({
  label,
  value,
  onChange,
  onBlur,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
}) {
  return (
    <TextField
      label={label}
      type="email"
      placeholder="you@example.com"
      autoComplete="email"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
    />
  )
}
