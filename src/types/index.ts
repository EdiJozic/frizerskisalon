export interface Barber {
  id: string
  salon_id: string
  name: string
  color: string
  active: boolean
  sort_order: number
  created_at: string
}

export interface Client {
  id: string
  salon_id: string
  first_name: string
  last_name: string
  phone: string
  notes: string | null
  created_at: string
}

export interface Booking {
  id: string
  salon_id: string
  barber_id: string
  client_id: string | null
  client_first_name: string
  client_last_name: string
  client_phone: string
  service: string
  description: string | null
  color: string
  start_time: string // ISO timestamp
  end_time: string // ISO timestamp
  reminder_enabled: boolean
  created_at: string
  updated_at: string
  // joined at query time
  client?: Client | null
}

export interface Salon {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface Profile {
  id: string
  salon_id: string | null
  role: 'admin' | 'barber'
  full_name: string | null
}

export type CalendarViewMode = 'day' | 'week' | 'month'

export const SERVICE_COLORS: { label: string; value: string }[] = [
  { label: 'Šišanje', value: '#c9861a' },
  { label: 'Bojanje', value: '#b5473a' },
  { label: 'Pramenovi', value: '#7a6fb0' },
  { label: 'Muško', value: '#3d6b8f' },
  { label: 'Žensko', value: '#c76a95' },
  { label: 'Djeca', value: '#4f9d6e' },
  { label: 'Ostalo', value: '#6b5f4e' }
]
