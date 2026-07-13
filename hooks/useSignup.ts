'use client'

import { useEffect, useState } from 'react'
import type { Carer, CarerField, CarerErrors, SignupData } from '@/lib/signup/types'
import { PARENT1_REQUIRED, PARENT2_REQUIRED } from '@/lib/signup/constants'
import {
  sanitizeCarerField, sanitizeName, sanitizePhone,
  validateCarer, crossCarerErrors, validateEmergency,
  isPostcode, formatPostcode, isCarerEmpty,
} from '@/lib/signup/validation'

const STORAGE_KEY = 'sz_signup'

const emptyCarer = (): Carer => ({
  fullName: '', email: '', phone: '', line1: '', line2: '', city: '', postcode: '',
})

/** Only surface an error once the field has been blurred (touched). */
function gate<T extends Record<string, string>>(raw: T, touched: Record<string, boolean>): Partial<T> {
  const out: Partial<T> = {}
  for (const key in raw) if (touched[key]) out[key] = raw[key]
  return out
}

const allTouched = (c: Carer): Record<string, boolean> =>
  Object.fromEntries(Object.keys(c).map(k => [k, true]))

interface Persisted {
  step: number
  carer1: Carer
  showCarer2: boolean
  carer2: Carer
  emergencyName: string
  emergencyPhone: string
}

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

  // ── Persistence: survive a refresh, but not a new tab/session ──
  // This is state, NOT a ref, on purpose: a ref would flip to true inside the
  // restore effect and the save effect (same commit) would then immediately
  // persist the still-empty initial state, wiping the saved form. As state, the
  // save effect skips the mount commit and only runs once the restore is applied.
  const [hydrated, setHydrated] = useState(false)

  // Restoring must happen AFTER mount: sessionStorage doesn't exist on the server,
  // so seeding state from it during render would make the server HTML (empty form)
  // disagree with the client's restored values and break hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p: Persisted = JSON.parse(raw)
        setStep(p.step ?? 1)
        setCarer1({ ...emptyCarer(), ...p.carer1 })
        setShowCarer2(!!p.showCarer2)
        setCarer2({ ...emptyCarer(), ...p.carer2 })
        setEmergencyNameRaw(p.emergencyName ?? '')
        setEmergencyPhoneRaw(p.emergencyPhone ?? '')
      }
    } catch {
      // corrupt/unavailable storage — start fresh rather than crash
    }
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return // don't clobber saved data with initial defaults
    const payload: Persisted = { step, carer1, showCarer2, carer2, emergencyName, emergencyPhone }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // storage full/blocked — persistence is best-effort, never fatal
    }
  }, [hydrated, step, carer1, showCarer2, carer2, emergencyName, emergencyPhone])

  // Leaving the sign-up flow discards the draft; a refresh keeps it.
  // Why this works: navigating away unmounts React and runs this cleanup, but a
  // refresh destroys the page without running cleanup — so refreshed data survives.
  // The pathname check guards React StrictMode's dev-only mount→unmount→mount
  // cycle, where we're still on /signup and must NOT clear.
  useEffect(() => {
    return () => {
      if (!window.location.pathname.startsWith('/signup')) {
        try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
      }
    }
  }, [])

  /** Call after a successful submit so a fresh sign-up doesn't reuse stale data. */
  function clearSaved() {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }

  // ── field updaters (sanitized + capped) ──
  const updateCarer1 = (f: CarerField, v: string) => setCarer1(c => ({ ...c, [f]: sanitizeCarerField(f, v) }))
  const updateCarer2 = (f: CarerField, v: string) => setCarer2(c => ({ ...c, [f]: sanitizeCarerField(f, v) }))
  const setEmergencyName = (v: string) => setEmergencyNameRaw(sanitizeName(v))
  const setEmergencyPhone = (v: string) => setEmergencyPhoneRaw(sanitizePhone(v))

  /** On blur: mark touched, trim the value, and tidy a VALID postcode. */
  const blurCarer = (
    setter: React.Dispatch<React.SetStateAction<Carer>>,
    touchSetter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  ) => (f: CarerField) => {
    touchSetter(t => ({ ...t, [f]: true }))
    setter(c => {
      let v = c[f].trim()
      // Never reshape an invalid postcode — that moves the space to the wrong
      // place and makes it harder to correct.
      if (f === 'postcode' && isPostcode(v)) v = formatPostcode(v)
      return v === c[f] ? c : { ...c, [f]: v }
    })
  }
  const touchCarer1 = blurCarer(setCarer1, setCarer1Touched)
  const touchCarer2 = blurCarer(setCarer2, setCarer2Touched)

  const touchEmergency = (f: 'name' | 'phone') => {
    setEmergencyTouched(t => ({ ...t, [f]: true }))
    if (f === 'name') setEmergencyNameRaw(v => v.trim())
  }

  function addCarer2() { setShowCarer2(true) }
  function removeCarer2() {
    setShowCarer2(false)
    setCarer2(emptyCarer())
    setCarer2Touched({})
  }

  // ── validation ──
  const carer1Raw = validateCarer(carer1, PARENT1_REQUIRED)
  const carer2Raw: CarerErrors = showCarer2
    ? { ...validateCarer(carer2, PARENT2_REQUIRED), ...crossCarerErrors(carer1, carer2) }
    : {}

  // An untouched/blank second carer is treated as absent everywhere.
  const carer2Effective = showCarer2 && !isCarerEmpty(carer2) ? carer2 : null

  const { errors: emergencyRaw, nameDuplicatesCarer } = validateEmergency(
    { name: emergencyName, phone: emergencyPhone },
    carer1,
    carer2Effective,
  )

  // ── visible (touched-gated) errors ──
  const carer1Errors = gate(carer1Raw as Record<string, string>, carer1Touched) as CarerErrors
  const carer2Errors = gate(carer2Raw as Record<string, string>, carer2Touched) as CarerErrors
  const emergencyErrors = gate(emergencyRaw, emergencyTouched)

  const emergencyNameWarning =
    emergencyTouched.name && nameDuplicatesCarer && emergencyName.trim()
      ? 'This matches a carer above — please make sure it’s a different person.'
      : ''

  const step1Valid =
    Object.keys(carer1Raw).length === 0 &&
    Object.keys(carer2Raw).length === 0 &&
    Object.keys(emergencyRaw).length === 0

  /** Reveal every error at once — used when the user tries to advance too early. */
  function touchAllStep1() {
    setCarer1Touched(allTouched(carer1))
    if (showCarer2) setCarer2Touched(allTouched(carer2))
    setEmergencyTouched({ name: true, phone: true })
  }

  /** Next stays enabled: if invalid, show every error instead of advancing. */
  function attemptNext() {
    if (!step1Valid) {
      touchAllStep1()
      return false
    }
    setStep(2)
    return true
  }

  /** The data as the API layer wants it (carer2 dropped when blank). */
  function getSignupData(): SignupData {
    return {
      carer1,
      carer2: carer2Effective,
      emergency: { name: emergencyName, phone: emergencyPhone },
    }
  }

  return {
    step, setStep,
    carer1, updateCarer1, touchCarer1, carer1Errors, carer1Required: PARENT1_REQUIRED,
    showCarer2, addCarer2, removeCarer2,
    carer2, updateCarer2, touchCarer2, carer2Errors, carer2Required: PARENT2_REQUIRED,
    emergencyName, setEmergencyName,
    emergencyPhone, setEmergencyPhone,
    touchEmergency, emergencyErrors, emergencyNameWarning,
    step1Valid, attemptNext,
    getSignupData, clearSaved,
  }
}
