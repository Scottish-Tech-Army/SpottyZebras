'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type {
  Carer, CarerField, CarerErrors, SignupData, Child, ChildField, ChildErrors,
} from '@/lib/signup/types'
import { PARENT1_REQUIRED, PARENT2_REQUIRED, MAX_CHILDREN, PASSWORD_MAX } from '@/lib/signup/constants'
import {
  sanitizeCarerField, sanitizeChildField, sanitizeName, sanitizePhone,
  validateCarer, crossCarerErrors, validateEmergency, validateChild,
  hasAnySupportNeeds, SUPPORT_NEEDS_REQUIRED_MSG, isPasswordValid,
  isPostcode, formatPostcode, isCarerEmpty,
} from '@/lib/signup/validation'

const STORAGE_KEY = 'sz_signup'

const emptyCarer = (): Carer => ({
  fullName: '', email: '', phone: '', line1: '', line2: '', city: '', postcode: '',
})

const emptyChild = (): Child => ({
  name: '', dob: '', supportNeeds: '', allergies: '',
  photoConsent: false,
  sameAddressAsCarer1: true,   // on by default
  line1: '', line2: '', city: '', postcode: '',
})

/** Only surface an error once the field has been blurred (touched). */
function gate<T extends Record<string, string>>(raw: T, touched: Record<string, boolean>): Partial<T> {
  const out: Partial<T> = {}
  for (const key in raw) if (touched[key]) out[key] = raw[key]
  return out
}

const allTouched = (o: object): Record<string, boolean> =>
  Object.fromEntries(Object.keys(o).map(k => [k, true]))

// Intentionally NOT persisted:
//  - `step` — it lives in the URL (?step=N) for browser back/forward.
//  - `password` — a password must never be written to browser storage.
//  - `agreedToTerms` — consent must be a deliberate action each session, so a
//    refresh always requires re-ticking it.
interface Persisted {
  carer1: Carer
  showCarer2: boolean
  carer2: Carer
  emergencyName: string
  emergencyPhone: string
  children: Child[]
  referralSource: string
}

export function useSignup() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [carer1, setCarer1] = useState<Carer>(emptyCarer())
  const [carer1Touched, setCarer1Touched] = useState<Record<string, boolean>>({})

  const [showCarer2, setShowCarer2] = useState(false)
  const [carer2, setCarer2] = useState<Carer>(emptyCarer())
  const [carer2Touched, setCarer2Touched] = useState<Record<string, boolean>>({})

  const [emergencyName, setEmergencyNameRaw] = useState('')
  const [emergencyPhone, setEmergencyPhoneRaw] = useState('')
  const [emergencyTouched, setEmergencyTouched] = useState<Record<string, boolean>>({})

  // Step 2 — at least one child is always required.
  const [children, setChildren] = useState<Child[]>([emptyChild()])
  const [childrenTouched, setChildrenTouched] = useState<Record<string, boolean>[]>([{}])
  /** Set once the user presses Next on step 2, so form-level errors can appear. */
  const [step2Attempted, setStep2Attempted] = useState(false)

  // Step 3. Password is deliberately NOT persisted to sessionStorage (see below).
  const [password, setPasswordRaw] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [referralSource, setReferralSource] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const setPassword = (v: string) => setPasswordRaw(v.slice(0, PASSWORD_MAX))

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
        setCarer1({ ...emptyCarer(), ...p.carer1 })
        setShowCarer2(!!p.showCarer2)
        setCarer2({ ...emptyCarer(), ...p.carer2 })
        setEmergencyNameRaw(p.emergencyName ?? '')
        setEmergencyPhoneRaw(p.emergencyPhone ?? '')
        if (p.children?.length) {
          const restored = p.children.map(c => ({ ...emptyChild(), ...c }))
          setChildren(restored)
          setChildrenTouched(restored.map(() => ({})))
        }
        setReferralSource(p.referralSource ?? '')
        // NB: password and consent are deliberately not restored — see Persisted.
      }
    } catch {
      // corrupt/unavailable storage — start fresh rather than crash
    }
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return // don't clobber saved data with initial defaults
    const payload: Persisted = {
      carer1, showCarer2, carer2, emergencyName, emergencyPhone, children,
      referralSource,
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // storage full/blocked — persistence is best-effort, never fatal
    }
  }, [hydrated, carer1, showCarer2, carer2, emergencyName, emergencyPhone, children, referralSource])

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

  // ── children ──
  const updateChild = (i: number, f: ChildField, v: string) =>
    setChildren(cs => cs.map((c, idx) => (idx === i ? { ...c, [f]: sanitizeChildField(f, v) } : c)))

  /** On blur: mark touched, trim, and tidy a VALID postcode (same rule as carers). */
  const touchChild = (i: number, f: ChildField) => {
    setChildrenTouched(ts => ts.map((t, idx) => (idx === i ? { ...t, [f]: true } : t)))
    setChildren(cs =>
      cs.map((c, idx) => {
        if (idx !== i) return c
        let v = c[f].trim()
        if (f === 'postcode' && isPostcode(v)) v = formatPostcode(v)
        return v === c[f] ? c : { ...c, [f]: v }
      }),
    )
  }

  const toggleChildSameAddress = (i: number, checked: boolean) =>
    setChildren(cs =>
      cs.map((c, idx) =>
        idx === i
          // Clear the address when switching back to "same as carer 1" so we never
          // carry stale values into the payload.
          ? checked
            ? { ...c, sameAddressAsCarer1: true, line1: '', line2: '', city: '', postcode: '' }
            : { ...c, sameAddressAsCarer1: false }
          : c,
      ),
    )

  const toggleChildPhotoConsent = (i: number, checked: boolean) =>
    setChildren(cs => cs.map((c, idx) => (idx === i ? { ...c, photoConsent: checked } : c)))

  const canAddChild = children.length < MAX_CHILDREN
  function addChild() {
    if (!canAddChild) return
    setChildren(cs => [...cs, emptyChild()])
    setChildrenTouched(ts => [...ts, {}])
  }

  /** The first child can't be removed — at least one is always required. */
  function removeChild(i: number) {
    if (children.length <= 1) return
    setChildren(cs => cs.filter((_, idx) => idx !== i))
    setChildrenTouched(ts => ts.filter((_, idx) => idx !== i))
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

  // ── step 2 validation ──
  const childrenRaw: ChildErrors[] = children.map(validateChild)

  // Form-level rule: across ALL children, at least one must have support needs.
  const supportNeedsMissing = !hasAnySupportNeeds(children)
  const supportNeedsError = step2Attempted && supportNeedsMissing ? SUPPORT_NEEDS_REQUIRED_MSG : ''

  const childrenErrors: ChildErrors[] = childrenRaw.map(
    (raw, i) => gate(raw as Record<string, string>, childrenTouched[i] ?? {}) as ChildErrors,
  )

  const step2Valid =
    childrenRaw.every(e => Object.keys(e).length === 0) && !supportNeedsMissing

  // ── step 3 validation ──
  const passwordValid = isPasswordValid(password)
  const passwordError = passwordTouched && !passwordValid
    ? 'Please meet all the password requirements below.'
    : ''
  // Mandatory: a valid password and ticked consent. (Referral is optional.)
  const step3Valid = passwordValid && agreedToTerms
  const canSubmit = step1Valid && step2Valid && step3Valid

  // ── URL-driven step + guard ──
  // The step lives in ?step=N so the browser back/forward buttons move between
  // steps. `allowedStep` is the furthest the user has legitimately unlocked; the
  // effect below bounces anyone (deep link, typed URL, forward button) who is
  // ahead of it back to the earliest incomplete step.
  const allowedStep = step1Valid ? (step2Valid ? 3 : 2) : 1

  const parsed = Number(searchParams.get('step'))
  const requestedStep = Number.isInteger(parsed) && parsed >= 1 && parsed <= 3 ? parsed : 1
  const step = Math.min(requestedStep, allowedStep)

  // The canonical query for the resolved step: empty for step 1, "step=N" for 2/3.
  // We compare the WHOLE query string, not just the step param, so ANY junk —
  // ?step=99, ?step=abc, ?skjgsg, ?step=2&foo=bar, a stale step ahead of what's
  // unlocked — is normalised away.
  const currentQuery = searchParams.toString()
  const canonicalQuery = step === 1 ? '' : `step=${step}`

  useEffect(() => {
    // Wait for the draft to be restored first — before hydration, validity is
    // computed from empty state and would wrongly kick a refreshed user to step 1.
    if (!hydrated) return
    // REPLACE (never push): a nonexistent URL corrects itself in place, so it
    // never occupies a back-stack slot. Real navigation (Next pushes ?step=N,
    // Back pops it) is untouched, so the natural history is preserved.
    if (currentQuery !== canonicalQuery) {
      router.replace(canonicalQuery ? `/signup?${canonicalQuery}` : '/signup')
    }
  }, [hydrated, currentQuery, canonicalQuery, router])

  const goToStep = (n: number) => router.push(`/signup?step=${n}`)

  /** Reveal every error at once — used when the user tries to advance too early. */
  function touchAllStep1() {
    setCarer1Touched(allTouched(carer1))
    if (showCarer2) setCarer2Touched(allTouched(carer2))
    setEmergencyTouched({ name: true, phone: true })
  }

  function touchAllStep2() {
    setChildrenTouched(children.map(c => allTouched(c)))
  }

  /** Next stays enabled: if invalid, show every error instead of advancing. */
  function attemptNext() {
    if (step === 1) {
      if (!step1Valid) { touchAllStep1(); return false }
      goToStep(2)
      return true
    }
    if (step === 2) {
      setStep2Attempted(true)   // lets the form-level support-needs error appear
      if (!step2Valid) { touchAllStep2(); return false }
      goToStep(3)
      return true
    }
    return false
  }

  /** Back never validates and never clears — the draft is preserved. Uses browser
   *  history so it stays in sync with the hardware/browser back button. */
  function back() {
    router.back()
  }

  /** The data as the API layer wants it (carer2 dropped when blank). */
  function getSignupData(): SignupData {
    return {
      carer1,
      carer2: carer2Effective,
      emergency: { name: emergencyName, phone: emergencyPhone },
      children,
      password,
      referralSource,
      agreedToTerms,
    }
  }

  /** Final submit. Gathers the payload once everything is valid.
   *  TODO: POST to /api/signup (create auth user → app_user → parent_profile →
   *  children), then clearSaved() + redirect to a "pending approval" screen. */
  function submit() {
    if (!canSubmit) { setPasswordTouched(true); return false }
    const data = getSignupData()
    void data // wiring to the API is the next task
    return true
  }

  return {
    step, hydrated, back,
    carer1, updateCarer1, touchCarer1, carer1Errors, carer1Required: PARENT1_REQUIRED,
    showCarer2, addCarer2, removeCarer2,
    carer2, updateCarer2, touchCarer2, carer2Errors, carer2Required: PARENT2_REQUIRED,
    emergencyName, setEmergencyName,
    emergencyPhone, setEmergencyPhone,
    touchEmergency, emergencyErrors, emergencyNameWarning,
    step1Valid,
    // step 2
    children, childrenErrors,
    updateChild, touchChild, toggleChildSameAddress, toggleChildPhotoConsent,
    addChild, removeChild, canAddChild,
    supportNeedsError, step2Valid,
    // step 3
    password, setPassword, passwordTouched, setPasswordTouched, passwordError,
    referralSource, setReferralSource,
    agreedToTerms, setAgreedToTerms,
    canSubmit, submit,
    attemptNext,
    getSignupData, clearSaved,
  }
}
