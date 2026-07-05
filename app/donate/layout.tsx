import { DonationProvider } from '@/hooks/useDonation'

// This layout wraps every route under /donate (form, payment, success) in one
// DonationProvider. The provider stays mounted while the user moves between
// those pages — so a half-filled form survives "Continue to payment" → back —
// and unmounts (discarding the data) the moment they leave the donation flow.
export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <DonationProvider>{children}</DonationProvider>
}
