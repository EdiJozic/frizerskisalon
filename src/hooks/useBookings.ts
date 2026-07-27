import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/types'

export interface BookingInput {
  barber_id: string
  client_id: string | null
  client_first_name: string
  client_last_name: string
  client_phone: string
  service: string
  description: string | null
  color: string
  start_time: string
  end_time: string
  reminder_enabled: boolean
}

export function useBookings(salonId: string | null, rangeStart: Date, rangeEnd: Date) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!salonId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('salon_id', salonId)
      .lt('start_time', rangeEnd.toISOString())
      .gt('end_time', rangeStart.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      setSyncError(error.message)
    } else {
      setBookings((data as Booking[]) ?? [])
      setSyncError(null)
      // cache last successful pull for offline viewing
      try {
        localStorage.setItem(`bookings-cache-${salonId}`, JSON.stringify(data))
      } catch {
        /* ignore quota errors */
      }
    }
    setLoading(false)
  }, [salonId, rangeStart.getTime(), rangeEnd.getTime()])

  useEffect(() => {
    if (!salonId) return
    // offline-first: show cached data immediately while network loads
    try {
      const cached = localStorage.getItem(`bookings-cache-${salonId}`)
      if (cached) setBookings(JSON.parse(cached))
    } catch {
      /* ignore */
    }
    load()

    const channel = supabase
      .channel(`bookings-${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `salon_id=eq.${salonId}` }, () => {
        load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [salonId, load])

  const createBooking = async (input: BookingInput): Promise<{ error: string | null }> => {
    if (!salonId) return { error: 'Nema aktivnog salona.' }
    const { error } = await supabase.from('bookings').insert({ ...input, salon_id: salonId })
    return { error: error?.message ?? null }
  }

  const updateBooking = async (id: string, patch: Partial<BookingInput>): Promise<{ error: string | null }> => {
    const { error } = await supabase.from('bookings').update(patch).eq('id', id)
    return { error: error?.message ?? null }
  }

  const deleteBooking = async (id: string) => {
    await supabase.from('bookings').delete().eq('id', id)
  }

  return { bookings, loading, syncError, createBooking, updateBooking, deleteBooking, reload: load }
}
