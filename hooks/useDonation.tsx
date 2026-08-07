'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { isEmail, isPostcode, formatPostcode, sanitizeEmail, sanitizePostcode } from '@/lib/signup/validation'

const PRESETS = [5, 10, 20, 50, 100]

export type Frequency = 'monthly' | 'one-off'

function sanitizeAmount(v: string): string {
  // Strip everything except digits and the first decimal point
  let cleaned = v.replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot !== -1) {
    // Remove any extra dots after the first
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
    // Cap at 2 decimal places
    if (cleaned.length > firstDot + 3) cleaned = cleaned.slice(0, firstDot + 3)
  }
  return cleaned
}

function getAmountError(amount: string): string {
  if (amount === '') return 'Please enter an amount.'
  const n = parseFloat(amount)
  if (isNaN(n) || n <= 0) return 'Please enter a valid amount.'
  if (n < 1) return 'Minimum donation is £1.'
  return ''
}

// All donation state lives here. It's held by DonationProvider (mounted in the
// donate layout) so it survives navigation between /donate and /donate/payment,
// and is discarded automatically when the user leaves the donation flow.
function useDonationState() {
  const router = useRouter()

  const [frequency, setFrequency] = useState<Frequency>('one-off')
  const [amount, setAmountRaw] = useState('5')
  const [amountTouched, setAmountTouched] = useState(false)
  const [giftAid, setGiftAid] = useState(true)
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [email, setEmailRaw] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  // Gift Aid address (HMRC requires the donor's home address to claim Gift Aid)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine1Touched, setAddressLine1Touched] = useState(false)
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcodeRaw] = useState('')
  const [postcodeTouched, setPostcodeTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  function setAmount(v: string) {
    setAmountRaw(sanitizeAmount(v))
  }
  // Same sanitizers as sign-up: email strips stray characters, postcode uppercases.
  const setEmail = (v: string) => setEmailRaw(sanitizeEmail(v))
  const setPostcode = (v: string) => setPostcodeRaw(sanitizePostcode(v))
  // On blur, tidy a VALID postcode to its canonical spacing (as sign-up does).
  function blurPostcode() {
    setPostcodeTouched(true)
    setPostcodeRaw(prev => (isPostcode(prev) ? formatPostcode(prev) : prev))
  }

  // Pre-fill from the donor's saved details when they're logged in; guests stay blank.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current) return
    prefilled.current = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('/api/donor-profile', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const p = await res.json()
        // Only fill fields the donor hasn't already started editing.
        if (p.fullName)     setName(prev => prev || p.fullName)
        if (p.email)        setEmailRaw(prev => prev || p.email)
        if (p.addressLine1) setAddressLine1(prev => prev || p.addressLine1)
        if (p.addressLine2) setAddressLine2(prev => prev || p.addressLine2)
        if (p.city)         setCity(prev => prev || p.city)
        if (p.postcode)     setPostcodeRaw(prev => prev || p.postcode)
      } catch {
        // Pre-fill is best-effort — never block the form.
      }
    })()
  }, [])

  // Wipe everything back to defaults — used after a completed donation.
  function reset() {
    setFrequency('one-off')
    setAmountRaw('5')
    setAmountTouched(false)
    setGiftAid(true)
    setName(''); setNameTouched(false)
    setEmail(''); setEmailTouched(false)
    setAddressLine1(''); setAddressLine1Touched(false)
    setAddressLine2('')
    setCity('')
    setPostcode(''); setPostcodeTouched(false)
    setLoading(false)
    setApiError('')
  }

  const parsedAmount = parseFloat(amount) || 0
  const selectedPreset = PRESETS.includes(parsedAmount) ? parsedAmount : null
  // The donor is only ever charged their donation. Gift Aid is reclaimed by the
  // charity from HMRC (25% of the donation, from tax the donor already paid) —
  // it must NOT increase what the card is charged.
  const finalAmount = parsedAmount
  // What the charity will later reclaim, for display only (never charged).
  const giftAidBonus = giftAid ? Math.round(parsedAmount * 0.25 * 100) / 100 : 0

  const amountErr   = getAmountError(amount)
  const nameErr     = name.trim() === '' ? 'Please enter your full name.' : ''
  const emailErr    = email.trim() === ''
    ? 'Please enter your email.'
    : !isEmail(email) ? 'Please enter a valid email.' : ''
  // Address + postcode are only required to claim Gift Aid (HMRC needs the donor's
  // home address); the postcode is also format-checked, like sign-up.
  const addressLine1Err = giftAid && addressLine1.trim() === '' ? 'Please enter your address.' : ''
  const postcodeErr     = !giftAid
    ? ''
    : postcode.trim() === ''
      ? 'Please enter your postcode.'
      : !isPostcode(postcode) ? 'Please enter a valid UK postcode.' : ''

  const isFormValid = !amountErr && !nameErr && !emailErr && !addressLine1Err && !postcodeErr

  const ctaLabel = finalAmount > 0
    ? `Continue to payment · £${finalAmount.toFixed(2)}${frequency === 'monthly' ? '/mo' : ''}`
    : 'Continue to payment'

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!isFormValid) return
    setApiError('')
    setLoading(true)
    try {
      // Monthly = Stripe Subscription (recurring); one-off = single PaymentIntent.
      const endpoint = frequency === 'monthly'
        ? '/api/create-subscription'
        : '/api/create-payment-intent'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPence: Math.round(finalAmount * 100),
          name,
          email,
          giftAid,
          // Address only sent when claiming Gift Aid
          addressLine1: giftAid ? addressLine1 : '',
          addressLine2: giftAid ? addressLine2 : '',
          city: giftAid ? city : '',
          postcode: giftAid ? postcode : '',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

      sessionStorage.setItem('sz_payment', JSON.stringify({
        clientSecret: data.clientSecret,
        amount: finalAmount,
        frequency,
        name,
        email,
      }))

      router.push('/donate/payment')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return {
    frequency, setFrequency,
    amount, setAmount,
    amountTouched, setAmountTouched,
    giftAid, setGiftAid,
    name, setName, nameTouched, setNameTouched,
    email, setEmail, emailTouched, setEmailTouched,
    addressLine1, setAddressLine1, addressLine1Touched, setAddressLine1Touched,
    addressLine2, setAddressLine2,
    city, setCity,
    postcode, setPostcode, postcodeTouched, setPostcodeTouched, blurPostcode,
    loading, apiError,
    selectedPreset,
    finalAmount,
    giftAidBonus,
    ctaLabel,
    isFormValid,
    amountErr, nameErr, emailErr, addressLine1Err, postcodeErr,
    handleSubmit,
    reset,
  }
}

type DonationContextValue = ReturnType<typeof useDonationState>

const DonationContext = createContext<DonationContextValue | null>(null)

export function DonationProvider({ children }: { children: ReactNode }) {
  const value = useDonationState()
  return <DonationContext.Provider value={value}>{children}</DonationContext.Provider>
}

export function useDonation() {
  const ctx = useContext(DonationContext)
  if (!ctx) throw new Error('useDonation must be used within a DonationProvider')
  return ctx
}
