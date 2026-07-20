'use client'

import { TextField } from '@/components/ui/TextField'
import DateField from '@/components/signup/DateField'
import AddressFields from '@/components/signup/AddressFields'
import { CHILD_ADDRESS_REQUIRED } from '@/lib/signup/constants'
import { dobBounds } from '@/lib/signup/validation'
import type { Child, ChildField, ChildErrors } from '@/lib/signup/types'

// Children may be registered from age 0 up to their 18th birthday.
const DOB_BOUNDS = dobBounds()

export default function ChildCard({
  index,
  child,
  errors,
  onChange,
  onBlur,
  onToggleSameAddress,
  onTogglePhotoConsent,
  onRemove,
}: {
  index: number
  child: Child
  errors: ChildErrors
  onChange: (field: ChildField, value: string) => void
  onBlur: (field: ChildField) => void
  onToggleSameAddress: (checked: boolean) => void
  onTogglePhotoConsent: (checked: boolean) => void
  /** Omitted for the first child — at least one is always required. */
  onRemove?: () => void
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-ink)] p-6 bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-bold text-[var(--color-text)]">Child {index + 1}</h4>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-[var(--color-secondary)] hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      <div className="border-t border-dashed border-[var(--color-border)] mb-5" />

      <div className="flex flex-col gap-3">
        <TextField
          label="Child's name *"
          value={child.name}
          onChange={v => onChange('name', v)}
          onBlur={() => onBlur('name')}
          error={errors.name}
        />

        <DateField
          label="Date of birth *"
          value={child.dob}
          onChange={v => onChange('dob', v)}
          onBlur={() => onBlur('dob')}
          error={errors.dob}
          min={DOB_BOUNDS.min}
          max={DOB_BOUNDS.max}
        />

        <TextField
          label="Additional support needs / medical conditions"
          value={child.supportNeeds}
          onChange={v => onChange('supportNeeds', v)}
          onBlur={() => onBlur('supportNeeds')}
          error={errors.supportNeeds}
        />

        <TextField
          label="Allergies"
          value={child.allergies}
          onChange={v => onChange('allergies', v)}
          onBlur={() => onBlur('allergies')}
          error={errors.allergies}
        />

        {/* Photo consent */}
        <label className="flex items-start gap-3 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={child.photoConsent}
            onChange={e => onTogglePhotoConsent(e.target.checked)}
            className="giftaid-check mt-0.5 h-4 w-4 rounded border-[var(--color-border-input)]"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            I give permission for photos of my child to be taken at events and shared on Spotty Zebras&apos; social media.
          </span>
        </label>

        {/* Address — matches carer 1 by default */}
        <label className="flex items-start gap-3 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={child.sameAddressAsCarer1}
            onChange={e => onToggleSameAddress(e.target.checked)}
            className="giftaid-check mt-0.5 h-4 w-4 rounded border-[var(--color-border-input)]"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            Address matches parent / carer 1
          </span>
        </label>

        {!child.sameAddressAsCarer1 && (
          <div className="flex flex-col gap-3 mt-1">
            <AddressFields
              address={child}
              errors={errors}
              onChange={onChange}
              onBlur={onBlur}
              required={CHILD_ADDRESS_REQUIRED}
            />
          </div>
        )}
      </div>
    </div>
  )
}
