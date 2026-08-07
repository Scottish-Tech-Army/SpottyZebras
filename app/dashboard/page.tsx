import { redirect } from 'next/navigation'

// The dashboard home is now the role-based Events page inside the app shell.
export default function DashboardPage() {
  redirect('/events')
}
