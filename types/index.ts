// Organisation
export interface Organisation {
  id: string
  name: string
  slug: string
  created_at: string
}

// User
export interface User {
  id: string
  email: string
  org_id: string
  role: 'admin' | 'caseworker' | 'viewer'
  created_at: string
}

// Event
export interface Event {
  id: string
  org_id: string
  title: string
  description?: string
  date: string
  time?: string
  location?: string
  is_paid: boolean
  price?: number
  capacity?: number
  created_at: string
}

// Booking
export interface Booking {
  id: string
  event_id: string
  user_id: string
  org_id: string
  status: 'confirmed' | 'cancelled'
  booked_at: string
}

// Donation
export interface Donation {
  id: string
  org_id: string
  amount: number
  currency: 'GBP' | 'USD'
  is_recurring: boolean
  status: 'completed' | 'pending' | 'failed'
  created_at: string
}