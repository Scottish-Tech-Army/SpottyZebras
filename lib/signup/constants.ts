import type { CarerField, ChildField, AddressField } from './types'

/** Children allowed per account 4 */
export const MIN_CHILDREN = 1
export const MAX_CHILDREN = 4

// Input caps — keep these at (or under) the DB column widths so a pasted blob
// can never overflow a column.
export const MAX = {
  fullName: 100,
  email: 254,   // RFC max
  phone: 11,    // national digits (country code lives in the fixed "+44" prefix)
  line1: 255,
  line2: 255,
  city: 100,
  postcode: 8,  // "SW1A 1AA"
  supportNeeds: 500,
  allergies: 500,
} as const

// Which fields each role must fill. These policies drive BOTH validation and the
// "*" markers in the UI, so the two can never disagree.
export const PARENT1_REQUIRED = new Set<CarerField>(['fullName', 'email', 'phone', 'line1', 'postcode'])
export const PARENT2_REQUIRED = new Set<CarerField>()

/** A child always needs a name and a date of birth. */
export const CHILD_REQUIRED = new Set<ChildField>(['name', 'dob'])
/** ...plus an address, but only when it differs from carer 1's. */
export const CHILD_ADDRESS_REQUIRED = new Set<AddressField>(['line1', 'postcode'])
/** When the child shares carer 1's address, nothing address-y is required. */
export const NO_ADDRESS_REQUIRED = new Set<AddressField>()

// ─── Step 3 ─────────────────────────────────────────────────────────────────

/** Password: minimum length + one of each character class. */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

/** "How did you hear about us?" — optional; the label string is stored verbatim. */
export const REFERRAL_OPTIONS = [
  'Friends or family',
  'Local authority',
  'Social media',
  'NHS',
  'Online search',
  'Local charity or NGO referral',
  'School staff visit or outreach program',
] as const
