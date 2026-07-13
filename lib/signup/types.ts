// ─── UI / domain shapes ─────────────────────────────────────────────────────

export interface Carer {
  fullName: string
  email: string
  phone: string   // national digits only; "+44" is added when mapping to the DB
  line1: string
  line2: string
  city: string
  postcode: string
}

export type CarerField = keyof Carer
export type CarerErrors = Partial<Record<CarerField, string>>

export interface EmergencyContact {
  name: string
  phone: string   // national digits only
}

/** Everything the sign-up wizard collects. Steps 2 and 3 extend this. */
export interface SignupData {
  carer1: Carer
  /** null when no second carer was added (or every field was left blank). */
  carer2: Carer | null
  emergency: EmergencyContact
  // TODO step 2: children: Child[]
  // TODO step 3: password, registrationGroup, referralSource
}

// ─── DB row shapes ──────────────────────────────────────────────────────────

// NOTE: CONTEXT.md summarises parent_profile as "address fields, second carer
// fields, emergency contact" without naming the columns. These names are our
// best guess — VERIFY against the real Supabase schema before wiring the API.
export interface ParentProfileRow {
  full_name: string
  email: string
  phone: string                              // E.164, e.g. +447123456789
  address_line1: string
  address_line2: string | null
  city: string | null
  postcode: string

  second_carer_full_name: string | null
  second_carer_email: string | null
  second_carer_phone: string | null
  second_carer_address_line1: string | null
  second_carer_address_line2: string | null
  second_carer_city: string | null
  second_carer_postcode: string | null

  emergency_contact_name: string
  emergency_contact_phone: string
}
