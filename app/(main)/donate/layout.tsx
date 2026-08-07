import { DonationProvider } from '@/hooks/useDonation'

// Keeps a half-filled donation form alive across form → payment → back, and
// discards it when the user leaves the donation flow. The nav/chrome comes from
// the shared AppShell in the parent (main) layout, so the menu is not remounted
// when switching to/from Donate.
export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <DonationProvider>{children}</DonationProvider>
}
