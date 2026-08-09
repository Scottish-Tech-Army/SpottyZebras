'use client'

import BackButton from '@/components/BackButton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { FormSection } from '@/components/ui/FormSection'
import AmountGrid from '@/components/donate/AmountGrid'
import FrequencyToggle from '@/components/donate/FrequencyToggle'
import GiftAidCard from '@/components/donate/GiftAidCard'
import { useDonation } from '@/hooks/useDonation'
import { useAppChrome } from '@/components/AppUserContext'

export default function DonatePage() {
  const {
    frequency, setFrequency,
    amount, setAmount,
    amountTouched, setAmountTouched,
    giftAid, setGiftAid,
    name, setName, nameTouched, setNameTouched,
    email, setEmail, emailTouched, setEmailTouched,
    addressLine1, setAddressLine1, addressLine1Touched, setAddressLine1Touched,
    addressLine2, setAddressLine2,
    city, setCity,
    postcode, setPostcode, postcodeTouched, blurPostcode,
    loading, apiError,
    selectedPreset,
    giftAidBonus,
    isFormValid,
    ctaLabel,
    amountErr, nameErr, emailErr, addressLine1Err, postcodeErr,
    handleSubmit,
  } = useDonation()
  const { loggedIn } = useAppChrome()

  return (
    <div className="flex-1 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-lg">
        {/* Title sits above the card, like the other screens. Anonymous donors get
            a back button; from the app menu the nav replaces it. */}
        <div className="mb-4 flex items-center gap-2">
          {!loggedIn && <BackButton href="/" />}
          <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Donate</h1>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FormSection label="How often">
            <FrequencyToggle value={frequency} onChange={setFrequency} />
          </FormSection>

          <FormSection label="Amount">
            <AmountGrid
              value={selectedPreset}
              onChange={a => setAmount(a.toString())}
            />
            <TextField
              label="Or enter another amount"
              prefix="£"
              value={amount}
              onChange={setAmount}
              onBlur={() => setAmountTouched(true)}
              error={amountTouched ? amountErr : undefined}
              type="text"
            />
          </FormSection>

          <GiftAidCard checked={giftAid} onChange={setGiftAid} bonus={giftAidBonus} />

          <FormSection label="Your details">
            <TextField
              label="Full name *"
              value={name}
              onChange={setName}
              onBlur={() => setNameTouched(true)}
              error={nameTouched ? nameErr : undefined}
              required
              autoComplete="name"
            />
            <TextField
              label="Email (for your receipt) *"
              type="email"
              value={email}
              onChange={setEmail}
              onBlur={() => setEmailTouched(true)}
              error={emailTouched ? emailErr : undefined}
              required
              autoComplete="email"
            />
          </FormSection>

          {giftAid && (
            <FormSection label="Your Gift Aid address">
              <p className="-mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                HMRC requires your home address so the charity can reclaim the tax on your donation.
              </p>
              <TextField
                label="Address line 1 *"
                value={addressLine1}
                onChange={setAddressLine1}
                onBlur={() => setAddressLine1Touched(true)}
                error={addressLine1Touched ? addressLine1Err : undefined}
                required
                autoComplete="address-line1"
              />
              <TextField
                label="Address line 2 (optional)"
                value={addressLine2}
                onChange={setAddressLine2}
                autoComplete="address-line2"
              />
              <TextField
                label="Town / City (optional)"
                value={city}
                onChange={setCity}
                autoComplete="address-level2"
              />
              <TextField
                label="Postcode *"
                value={postcode}
                onChange={setPostcode}
                onBlur={blurPostcode}
                error={postcodeTouched ? postcodeErr : undefined}
                required
                autoComplete="postal-code"
              />
            </FormSection>
          )}

          <div className="surface-sunken flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-[var(--color-border-input)] text-[var(--color-text-muted)] font-bold text-xs shrink-0 mt-0.5">🔒</span>
            <span>Payments handled by <strong className="text-[var(--color-text-secondary)]">Stripe</strong>. We never see or store your card details.</span>
          </div>

          {apiError && <p className="text-xs text-[var(--color-error)]">{apiError}</p>}

          <Button type="submit" size="lg" disabled={!isFormValid || loading}>
            {loading ? 'Please wait…' : ctaLabel}
          </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
