import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/types'

export function useClients(salonId: string | null) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!salonId) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('salon_id', salonId)
      .order('first_name', { ascending: true })
    setClients((data as Client[]) ?? [])
    setLoading(false)
  }, [salonId])

  useEffect(() => {
    load()
    if (!salonId) return
    const channel = supabase
      .channel(`clients-${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `salon_id=eq.${salonId}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [salonId, load])

  const findOrCreateClient = async (firstName: string, lastName: string, phone: string): Promise<Client | null> => {
    if (!salonId) return null
    const normalizedPhone = phone.trim()
    const existing = clients.find(
      (c) =>
        (normalizedPhone && c.phone.trim() === normalizedPhone) ||
        (c.first_name.toLowerCase() === firstName.toLowerCase() && c.last_name.toLowerCase() === lastName.toLowerCase())
    )
    if (existing) return existing

    const { data, error } = await supabase
      .from('clients')
      .insert({ salon_id: salonId, first_name: firstName, last_name: lastName, phone: normalizedPhone })
      .select()
      .single()
    if (error) return null
    return data as Client
  }

  const searchClients = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return clients.filter(
      (c) =>
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    )
  }

  const updateClient = async (id: string, patch: Partial<Client>) => {
    await supabase.from('clients').update(patch).eq('id', id)
  }

  return { clients, loading, findOrCreateClient, searchClients, updateClient, reload: load }
}
