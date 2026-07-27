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

  const hasOverlap = (barberId: string, start: string, end: string, excludeId?: string) => {
    return bookings.some((b) => {
      if (b.barber_id !== barberId) return false
      if (excludeId && b.id === excludeId) return false
      const bs = new Date(b.start_time).getTime()
      const be = new Date(b.end_time).getTime()
      const s = new Date(start).getTime()
      const e = new Date(end).getTime()
      return s < be && e > bs
    })
  }

  const createBooking = async (input: BookingInput): Promise<{ error: string | null }> => {
    if (!salonId) return { error: 'Nema aktivnog salona.' }
    if (hasOverlap(input.barber_id, input.start_time, input.end_time)) {
      return { error: 'Termin se preklapa s postojećom rezervacijom za ovog frizera.' }
    }
    const { error } = await supabase.from('bookings').insert({ ...input, salon_id: salonId })
    if (error) {
      if (error.message.includes('no_overlap_per_barber')) {
        return { error: 'Termin se preklapa s postojećom rezervacijom za ovog frizera.' }
      }
      return { error: error.message }
    }
    return { error: null }
  }

  const updateBooking = async (id: string, patch: Partial<BookingInput>): Promise<{ error: string | null }> => {
    const current = bookings.find((b) => b.id === id)
    if (current && (patch.start_time || patch.end_time || patch.barber_id)) {
      const start = patch.start_time ?? current.start_time
      const end = patch.end_time ?? current.end_time
      const barberId = patch.barber_id ?? current.barber_id
      if (hasOverlap(barberId, start, end, id)) {
        return { error: 'Termin se preklapa s postojećom rezervacijom za ovog frizera.' }
      }
    }
    const { error } = await supabase.from('bookings').update(patch).eq('id', id)
    if (error) {
      if (error.message.includes('no_overlap_per_barber')) {
        return { error: 'Termin se preklapa s postojećom rezervacijom za ovog frizera.' }
      }
      return { error: error.message }
    }
    return { error: null }
  }

  const deleteBooking = async (id: string) => {
    await supabase.from('bookings').delete().eq('id', id)
  }

  return { bookings, loading, syncError, hasOverlap, createBooking, updateBooking, deleteBooking, reload: load }
}
