'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

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

function getEmailError(email: string): string {
  if (email.trim() === '') return 'Please enter your email.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
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
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  // Gift Aid address (HMRC requires the donor's home address to claim Gift Aid)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine1Touched, setAddressLine1Touched] = useState(false)
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [postcodeTouched, setPostcodeTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  function setAmount(v: string) {
    setAmountRaw(sanitizeAmount(v))
  }

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
  const emailErr    = getEmailError(email)
  // Address is only required to claim Gift Aid (HMRC needs the donor's home address).
  const addressLine1Err = giftAid && addressLine1.trim() === '' ? 'Please enter your address.' : ''
  const postcodeErr     = giftAid && postcode.trim() === '' ? 'Please enter your postcode.' : ''

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
    postcode, setPostcode, postcodeTouched, setPostcodeTouched,
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
