// ─── UI / domain shapes ─────────────────────────────────────────────────────

/** Shared by carers and children so the fields, rules and UI are written once. */
export interface Address {
  line1: string
  line2: string
  city: string      // maps to the DB's `town`
  postcode: string
}
export type AddressField = keyof Address

export interface Carer extends Address {
  fullName: string
  email: string
  phone: string   // national digits only; "+44" is added when mapping to the DB
}

export type CarerField = keyof Carer
export type CarerErrors = Partial<Record<CarerField, string>>

export interface EmergencyContact {
  name: string
  phone: string   // national digits only
}

export interface Child extends Address {
  name: string
  dob: string             // ISO yyyy-mm-dd (from <input type="date">)
  supportNeeds: string    // → additional_support_needs
  allergies: string       // → allergies
  photoConsent: boolean   // → photo_consent
  /** When true, the address fields are hidden and carer 1's address is used. */
  sameAddressAsCarer1: boolean
}

/** The text fields of a child (excludes the two booleans). */
export type ChildField = Exclude<keyof Child, 'sameAddressAsCarer1' | 'photoConsent'>
export type ChildErrors = Partial<Record<ChildField, string>>

/** Everything the sign-up wizard collects. */
export interface SignupData {
  carer1: Carer
  /** null when no second carer was added (or every field was left blank). */
  carer2: Carer | null
  emergency: EmergencyContact
  children: Child[]
  // Step 3
  password: string          // creates the auth user — never persisted to storage
  referralSource: string    // → parent_profile.referral_source ('' = not answered)
  agreedToTerms: boolean     // consent gate (must be true to submit)
}

// ─── DB row shapes ────────────────────────────

export interface ParentProfileRow {
  full_name: string
  email: string
  phone: string                              // E.164, e.g. +447123456789
  address_line_1: string
  address_line_2: string | null
  town: string | null
  postcode: string

  second_carer_name: string | null
  // NOTE: new column — parent_profile must gain `second_carer_email`.
  second_carer_email: string | null
  second_carer_phone: string | null
  second_carer_address_line_1: string | null
  second_carer_address_line_2: string | null
  second_carer_town: string | null
  second_carer_postcode: string | null

  emergency_contact_name: string
  emergency_contact_phone: string
  referral_source: string | null
}

export interface ChildRow {
  full_name: string
  date_of_birth: string        // ISO yyyy-mm-dd
  address_line_1: string | null
  address_line_2: string | null
  town: string | null
  postcode: string | null
  additional_support_needs: string | null
  allergies: string | null
  photo_consent: boolean
  // parent_id is set server-side once the parent_profile row exists.
}
