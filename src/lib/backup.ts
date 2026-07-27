import { supabase } from './supabase'

export async function exportBackup(salonId: string) {
  const [barbers, clients, bookings] = await Promise.all([
    supabase.from('barbers').select('*').eq('salon_id', salonId),
    supabase.from('clients').select('*').eq('salon_id', salonId),
    supabase.from('bookings').select('*').eq('salon_id', salonId)
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    salon_id: salonId,
    barbers: barbers.data ?? [],
    clients: clients.data ?? [],
    bookings: bookings.data ?? []
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `salon-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export interface BackupPayload {
  salon_id: string
  barbers: Record<string, unknown>[]
  clients: Record<string, unknown>[]
  bookings: Record<string, unknown>[]
}

export async function importBackup(salonId: string, file: File): Promise<{ error: string | null }> {
  try {
    const text = await file.text()
    const data = JSON.parse(text) as BackupPayload

    // Re-scope every record to the CURRENT salon so imports never leak across accounts.
    const barbers = (data.barbers ?? []).map((b) => ({ ...b, salon_id: salonId }))
    const clients = (data.clients ?? []).map((c) => ({ ...c, salon_id: salonId }))
    const bookings = (data.bookings ?? []).map((bk) => ({ ...bk, salon_id: salonId }))

    if (barbers.length) {
      const { error } = await supabase.from('barbers').upsert(barbers)
      if (error) return { error: error.message }
    }
    if (clients.length) {
      const { error } = await supabase.from('clients').upsert(clients)
      if (error) return { error: error.message }
    }
    if (bookings.length) {
      const { error } = await supabase.from('bookings').upsert(bookings)
      if (error) return { error: error.message }
    }
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Neuspješno učitavanje datoteke.' }
  }
}
