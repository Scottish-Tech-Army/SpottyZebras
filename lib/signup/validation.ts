import type { Carer, CarerField, CarerErrors, EmergencyContact } from './types'
import { MAX } from './constants'

// ─── Sanitizers (block invalid characters + cap length as the user types) ────

const cap = (v: string, n: number) => v.slice(0, n)

// Letters of ANY language (\p{L}), spaces, hyphens and apostrophes — so names
// like "Anne-Marie", "O'Brien" and non-Latin scripts work; digits/symbols don't.
export const sanitizeName = (v: string) => cap(v.replace(/[^\p{L}\s'’-]/gu, ''), MAX.fullName)

// National UK number only — no country code, no leading 0. Pasting a full number
// (0044…/44…/07…) is normalised down to the national part.
export const sanitizePhone = (v: string) => {
  let d = v.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)   // international access code
  if (d.startsWith('44')) d = d.slice(2)   // UK country code
  return cap(d.replace(/^0+/, ''), MAX.phone)
}

export const sanitizeEmail = (v: string) => cap(v.replace(/[^A-Za-z0-9@._%+-]/g, ''), MAX.email)

export const sanitizePostcode = (v: string) =>
  cap(v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' '), MAX.postcode)

export function sanitizeCarerField(f: CarerField, v: string): string {
  switch (f) {
    case 'fullName': return sanitizeName(v)
    case 'email':    return sanitizeEmail(v)
    case 'phone':    return sanitizePhone(v)
    case 'postcode': return sanitizePostcode(v)
    case 'line1':    return cap(v, MAX.line1)
    case 'line2':    return cap(v, MAX.line2)
    case 'city':     return cap(v, MAX.city)
  }
}

// ─── Field validators ───────────────────────────────────────────────────────

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
/** Validates the national part only — the country code is the fixed "+44" prefix. */
export const isPhone = (v: string) => /^\d{9,11}$/.test(v.trim())
export const norm = (v: string) => v.trim().toLowerCase()

/** UK postcode format (tolerant of a missing space); also matches GIR 0AA. */
export const isPostcode = (v: string) =>
  /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i.test(v.trim())

/** Canonical form: single space before the final three characters (the incode). */
export function formatPostcode(v: string): string {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.length < 5) return v.trim().toUpperCase()
  return s.slice(0, -3) + ' ' + s.slice(-3)
}

/** True when the carer has no data at all (so we can drop an empty second carer). */
export const isCarerEmpty = (c: Carer) => Object.values(c).every(v => !v.trim())

// ─── Carer validation ───────────────────────────────────────────────────────

// Every field has a real message — an empty string here would be a falsy error
// that blocks submission while rendering nothing.
const REQUIRED_MSG: Record<CarerField, string> = {
  fullName: 'Please enter a full name.',
  email:    'Please enter an email.',
  phone:    'Please enter a phone number.',
  line1:    'Please enter the first line of the address.',
  line2:    'Please enter the second line of the address.',
  city:     'Please enter a town or city.',
  postcode: 'Please enter a postcode.',
}

const FORMAT: Partial<Record<CarerField, { valid: (v: string) => boolean; msg: string }>> = {
  email:    { valid: isEmail,    msg: 'Please enter a valid email.' },
  phone:    { valid: isPhone,    msg: 'Please enter a valid phone number.' },
  postcode: { valid: isPostcode, msg: 'Please enter a valid UK postcode.' },
}

/**
 * Generic carer validator: requiredness comes from the policy, format validity
 * always applies when a value is present. No per-role branching.
 */
export function validateCarer(c: Carer, required: Set<CarerField>): CarerErrors {
  const e: CarerErrors = {}
  for (const f of Object.keys(c) as CarerField[]) {
    if (!c[f].trim()) {
      if (required.has(f)) e[f] = REQUIRED_MSG[f]
      continue
    }
    const fmt = FORMAT[f]
    if (fmt && !fmt.valid(c[f])) e[f] = fmt.msg
  }
  return e
}

/** Carer 2 may not reuse carer 1's email or number. */
export function crossCarerErrors(carer1: Carer, carer2: Carer): CarerErrors {
  const e: CarerErrors = {}
  if (carer2.email.trim() && norm(carer2.email) === norm(carer1.email))
    e.email = 'Both carers can’t share an email.'
  if (carer2.phone.trim() && carer2.phone.trim() === carer1.phone.trim())
    e.phone = 'Both carers can’t share a number.'
  return e
}

// ─── Emergency contact validation ───────────────────────────────────────────

/**
 * A matching NAME is only a soft warning (two people can share a name); a matching
 * NUMBER is a hard error (it means it's actually one of the carers).
 */
export function validateEmergency(
  em: EmergencyContact,
  carer1: Carer,
  carer2: Carer | null,
): { errors: Record<string, string>; nameDuplicatesCarer: boolean } {
  const errors: Record<string, string> = {}

  const phoneDuplicates =
    !!em.phone.trim() &&
    (em.phone.trim() === carer1.phone.trim() ||
      (!!carer2 && em.phone.trim() === carer2.phone.trim()))

  if (!em.name.trim()) errors.name = 'Please enter an emergency contact name.'

  if (!em.phone.trim()) errors.phone = 'Please enter an emergency contact number.'
  else if (!isPhone(em.phone)) errors.phone = 'Please enter a valid phone number.'
  else if (phoneDuplicates) errors.phone = 'Use a different number from the carers above.'

  const nameDuplicatesCarer =
    !!norm(em.name) &&
    (norm(em.name) === norm(carer1.fullName) ||
      (!!carer2 && norm(em.name) === norm(carer2.fullName)))

  return { errors, nameDuplicatesCarer }
}
