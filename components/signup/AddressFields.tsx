'use client'

import { TextField } from '@/components/ui/TextField'
import type { Address, AddressField } from '@/lib/signup/types'

/**
 * The four address fields, written once and reused by every role that needs an
 * address (carer 1, carer 2, and each child). Which fields are mandatory comes
 * from the caller's policy set — the same set its validator uses.
 */
export default function AddressFields({
  address,
  errors,
  onChange,
  onBlur,
  required,
}: {
  address: Address
  errors: Partial<Record<AddressField, string>>
  onChange: (field: AddressField, value: string) => void
  onBlur: (field: AddressField) => void
  required: ReadonlySet<string>
}) {
  const suffix = (f: AddressField) => (required.has(f) ? ' *' : '')

  return (
    <>
      <TextField
        label={`Address line 1${suffix('line1')}`}
        value={address.line1}
        onChange={v => onChange('line1', v)}
        onBlur={() => onBlur('line1')}
        error={errors.line1}
        autoComplete="address-line1"
      />
      <TextField
        label="Address line 2"
        value={address.line2}
        onChange={v => onChange('line2', v)}
        onBlur={() => onBlur('line2')}
        error={errors.line2}
        autoComplete="address-line2"
      />
      <TextField
        label="Town / City"
        value={address.city}
        onChange={v => onChange('city', v)}
        onBlur={() => onBlur('city')}
        error={errors.city}
        autoComplete="address-level2"
      />
      <TextField
        label={`Postcode${suffix('postcode')}`}
        value={address.postcode}
        onChange={v => onChange('postcode', v)}
        onBlur={() => onBlur('postcode')}
        error={errors.postcode}
        autoComplete="postal-code"
      />
    </>
  )
}
