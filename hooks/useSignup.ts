'use client'

import { useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Carer {
  fullName: string
  email: string
  phone: string
  line1: string
  line2: string
  city: string
  postcode: string
}

export type CarerField = keyof Carer
export type CarerErrors = Partial<Record<CarerField, string>>

const emptyCarer = (): Carer => ({
  fullName: '', email: '', phone: '', line1: '', line2: '', city: '', postcode: '',
})

// ─── Input sanitizers (block invalid characters as the user types) ───────────

// Letters of ANY language (\p{L}), spaces, hyphens and apostrophes — so names
// like "Anne-Marie", "O'Brien" and non-Latin scripts are allowed, digits and
// symbols are not.
const sanitizeName = (v: string) => v.replace(/[^\p{L}\s'’-]/gu, '')

// National UK number only — no country code, no leading 0. The UI renders a
// fixed "+44" prefix and we store just these digits, so every number reaches the
// DB as "+44" + this value. Pasting a full number (0044.../44.../07...) is
// normalised down to the national part.
const sanitizePhone = (v: string) => {
  let d = v.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)   // international access code
  if (d.startsWith('44')) d = d.slice(2)   // UK country code
  return d.replace(/^0+/, '')              // national trunk "0"
}

// Characters that can legally appear in an email address.
const sanitizeEmail = (v: string) => v.replace(/[^A-Za-z0-9@._%+-]/g, '')

// Uppercase; letters, digits and single spaces only.
const sanitizePostcode = (v: string) =>
  v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ')

function sanitizeCarerField(f: CarerField, v: string): string {
  if (f === 'fullName') return sanitizeName(v)
  if (f === 'phone') return sanitizePhone(v)
  if (f === 'email') return sanitizeEmail(v)
  if (f === 'postcode') return sanitizePostcode(v)
  return v
}

// ─── Validators ─────────────────────────────────────────────────────────────

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
// Validates the national part only (country code lives in the fixed "+44" prefix).
const isPhone = (v: string) => /^\d{9,11}$/.test(v)
const norm = (v: string) => v.trim().toLowerCase()

// UK postcode format (tolerant of a missing space); also matches GIR 0AA.
const isPostcode = (v: string) =>
  /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i.test(v.trim())

// Canonical form: single space before the final three characters (the incode).
function formatPostcode(v: string): string {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.length < 5) return v.trim().toUpperCase()
  return s.slice(0, -3) + ' ' + s.slice(-3)
}

// Required carer fields: name, email, phone, address line 1, postcode.
// (line2 and city are optional.)
function carerErrors(c: Carer): CarerErrors {
  const e: CarerErrors = {}
  if (!c.fullName.trim()) e.fullName = 'Please enter a full name.'
  if (!c.email.trim()) e.email = 'Please enter an email.'
  else if (!isEmail(c.email)) e.email = 'Please enter a valid email.'
  if (!c.phone.trim()) e.phone = 'Please enter a phone number.'
  else if (!isPhone(c.phone)) e.phone = 'Please enter a valid phone number.'
  if (!c.line1.trim()) e.line1 = 'Please enter the first line of the address.'
  if (!c.postcode.trim()) e.postcode = 'Please enter a postcode.'
  else if (!isPostcode(c.postcode)) e.postcode = 'Please enter a valid UK postcode.'
  return e
}

// Only surface an error once the field has been blurred (touched).
function gate<T extends Record<string, string>>(raw: T, touched: Record<string, boolean>): Partial<T> {
  const out: Partial<T> = {}
  for (const key in raw) if (touched[key]) out[key] = raw[key]
  return out
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useSignup() {
  const [step, setStep] = useState(1)

  const [carer1, setCarer1] = useState<Carer>(emptyCarer())
  const [carer1Touched, setCarer1Touched] = useState<Record<string, boolean>>({})

  const [showCarer2, setShowCarer2] = useState(false)
  const [carer2, setCarer2] = useState<Carer>(emptyCarer())
  const [carer2Touched, setCarer2Touched] = useState<Record<string, boolean>>({})

  const [emergencyName, setEmergencyNameRaw] = useState('')
  const [emergencyPhone, setEmergencyPhoneRaw] = useState('')
  const [emergencyTouched, setEmergencyTouched] = useState<Record<string, boolean>>({})

  // ── field updaters (sanitized) ──
  const updateCarer1 = (f: CarerField, v: string) => setCarer1(c => ({ ...c, [f]: sanitizeCarerField(f, v) }))
  const updateCarer2 = (f: CarerField, v: string) => setCarer2(c => ({ ...c, [f]: sanitizeCarerField(f, v) }))
  const setEmergencyName = (v: string) => setEmergencyNameRaw(sanitizeName(v))
  const setEmergencyPhone = (v: string) => setEmergencyPhoneRaw(sanitizePhone(v))
  const touchCarer1 = (f: CarerField) => {
    setCarer1Touched(t => ({ ...t, [f]: true }))
    // Only tidy a VALID postcode — never reshape invalid input (that would move
    // the space to the wrong place and make it harder to correct).
    if (f === 'postcode') setCarer1(c => (isPostcode(c.postcode) ? { ...c, postcode: formatPostcode(c.postcode) } : c))
  }
  const touchCarer2 = (f: CarerField) => {
    setCarer2Touched(t => ({ ...t, [f]: true }))
    if (f === 'postcode') setCarer2(c => (isPostcode(c.postcode) ? { ...c, postcode: formatPostcode(c.postcode) } : c))
  }
  const touchEmergency = (f: 'name' | 'phone') => setEmergencyTouched(t => ({ ...t, [f]: true }))

  function addCarer2() { setShowCarer2(true) }
  function removeCarer2() {
    setShowCarer2(false)
    setCarer2(emptyCarer())
    setCarer2Touched({})
  }

  // ── raw errors ──
  const carer1Raw = carerErrors(carer1)
  const carer2Raw: CarerErrors = showCarer2 ? carerErrors(carer2) : {}

  // Carer 2 can't reuse carer 1's email or number (hard block, shown on carer 2).
  if (showCarer2) {
    if (carer2.email.trim() && norm(carer2.email) === norm(carer1.email))
      carer2Raw.email = 'Both carers can’t share an email.'
    if (carer2.phone && carer2.phone === carer1.phone)
      carer2Raw.phone = 'Both carers can’t share a number.'
  }

  // Emergency contact: required, valid, and NOT the same person (name or number)
  // as either carer. Numbers are already national digits, so compare directly.
  const nameDuplicatesCarer =
    !!norm(emergencyName) &&
    (norm(emergencyName) === norm(carer1.fullName) ||
      (showCarer2 && norm(emergencyName) === norm(carer2.fullName)))
  const phoneDuplicatesCarer =
    !!emergencyPhone &&
    (emergencyPhone === carer1.phone ||
      (showCarer2 && emergencyPhone === carer2.phone))

  // Hard errors (block "Next"): name required; phone required, valid, and not a
  // carer's number. A matching NAME is only a soft warning (see below) — two
  // different people can share a name, but a shared number means it's a carer.
  const emergencyRawClean: Record<string, string> = {}
  if (!emergencyName.trim()) emergencyRawClean.name = 'Please enter an emergency contact name.'
  if (!emergencyPhone.trim()) emergencyRawClean.phone = 'Please enter an emergency contact number.'
  else if (!isPhone(emergencyPhone)) emergencyRawClean.phone = 'Please enter a valid phone number.'
  else if (phoneDuplicatesCarer) emergencyRawClean.phone = 'Use a different number from the carers above.'

  // ── visible (touched-gated) errors for the UI ──
  const carer1Errors = gate(carer1Raw as Record<string, string>, carer1Touched) as CarerErrors
  const carer2Errors = gate(carer2Raw as Record<string, string>, carer2Touched) as CarerErrors
  const emergencyErrors = gate(emergencyRawClean, emergencyTouched)

  // Soft, non-blocking warning when the name matches a carer's.
  const emergencyNameWarning =
    emergencyTouched.name && nameDuplicatesCarer && emergencyName.trim()
      ? 'This matches a carer above — please make sure it’s a different person.'
      : ''

  const step1Valid =
    Object.keys(carer1Raw).length === 0 &&
    Object.keys(carer2Raw).length === 0 &&
    Object.keys(emergencyRawClean).length === 0

  return {
    step, setStep,
    carer1, updateCarer1, touchCarer1, carer1Errors,
    showCarer2, addCarer2, removeCarer2,
    carer2, updateCarer2, touchCarer2, carer2Errors,
    emergencyName, setEmergencyName,
    emergencyPhone, setEmergencyPhone,
    touchEmergency, emergencyErrors, emergencyNameWarning,
    step1Valid,
  }
}
