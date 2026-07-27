import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Barber } from '@/types'

export function useBarbers(salonId: string | null) {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!salonId) return
    const { data } = await supabase
      .from('barbers')
      .select('*')
      .eq('salon_id', salonId)
      .order('sort_order', { ascending: true })
    setBarbers((data as Barber[]) ?? [])
    setLoading(false)
  }, [salonId])

  useEffect(() => {
    load()
    if (!salonId) return
    const channel = supabase
      .channel(`barbers-${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers', filter: `salon_id=eq.${salonId}` }, () => {
        load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [salonId, load])

  const addBarber = async (name: string, color: string) => {
    if (!salonId) return
    await supabase.from('barbers').insert({ salon_id: salonId, name, color, sort_order: barbers.length })
  }

  const updateBarber = async (id: string, patch: Partial<Barber>) => {
    await supabase.from('barbers').update(patch).eq('id', id)
  }

  const removeBarber = async (id: string) => {
    await supabase.from('barbers').delete().eq('id', id)
  }

  return { barbers, loading, addBarber, updateBarber, removeBarber, reload: load }
}
