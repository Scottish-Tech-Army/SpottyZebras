import AppShell from '@/components/AppShell'

/** Wraps the authenticated app pages with the role-based nav shell. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
