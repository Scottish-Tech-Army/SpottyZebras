import type { CarerField } from './types'

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
} as const

// Which fields each carer must fill. This one policy drives BOTH validation and
// the "*" markers in the UI, so they can never disagree.
//   Carer 1 — everything required.  Carer 2 — nothing required (fully optional).
export const PARENT1_REQUIRED = new Set<CarerField>(['fullName', 'email', 'phone', 'line1', 'postcode'])
export const PARENT2_REQUIRED = new Set<CarerField>()
