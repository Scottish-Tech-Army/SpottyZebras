'use client'

import { TextField } from '@/components/ui/TextField'
import EmailField from '@/components/signup/EmailField'
import PhoneField from '@/components/signup/PhoneField'
import type { Carer, CarerField, CarerErrors } from '@/lib/signup/types'

export default function CarerFields({
  carer,
  errors,
  onChange,
  onBlur,
  required,
}: {
  carer: Carer
  errors: CarerErrors
  onChange: (field: CarerField, value: string) => void
  onBlur: (field: CarerField) => void
  required: Set<CarerField>
}) {
  // Same policy the validator uses, so the "*" markers can never drift from the
  // rules. No asterisk means optional — we don't spell that out on every field.
  const suffix = (f: CarerField) => (required.has(f) ? ' *' : '')

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label={`Full name${suffix('fullName')}`}
        value={carer.fullName}
        onChange={v => onChange('fullName', v)}
        onBlur={() => onBlur('fullName')}
        error={errors.fullName}
        autoComplete="name"
      />
      <EmailField
        label={`Email${suffix('email')}`}
        value={carer.email}
        onChange={v => onChange('email', v)}
        onBlur={() => onBlur('email')}
        error={errors.email}
      />
      <PhoneField
        label={`Phone${suffix('phone')}`}
        value={carer.phone}
        onChange={v => onChange('phone', v)}
        onBlur={() => onBlur('phone')}
        error={errors.phone}
      />
      <TextField
        label={`Address line 1${suffix('line1')}`}
        value={carer.line1}
        onChange={v => onChange('line1', v)}
        onBlur={() => onBlur('line1')}
        error={errors.line1}
        autoComplete="address-line1"
      />
      <TextField
        label="Address line 2"
        value={carer.line2}
        onChange={v => onChange('line2', v)}
        autoComplete="address-line2"
      />
      <TextField
        label="Town / City"
        value={carer.city}
        onChange={v => onChange('city', v)}
        autoComplete="address-level2"
      />
      <TextField
        label={`Postcode${suffix('postcode')}`}
        value={carer.postcode}
        onChange={v => onChange('postcode', v)}
        onBlur={() => onBlur('postcode')}
        error={errors.postcode}
        autoComplete="postal-code"
      />
    </div>
  )
}
