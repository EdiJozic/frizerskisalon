import { useEffect, useState } from 'react'
import { X, Trash2, Clock, User, Phone, Scissors, Palette, Bell } from 'lucide-react'
import { format } from 'date-fns'
import type { Barber, Booking, Client } from '@/types'
import { SERVICE_COLORS } from '@/types'

export interface BookingDraft {
  id?: string
  barberId: string
  clientId: string | null
  firstName: string
  lastName: string
  phone: string
  service: string
  description: string
  color: string
  start: Date
  reminderEnabled: boolean
}

interface Props {
  open: boolean
  draft: BookingDraft | null
  barbers: Barber[]
  searchClients: (q: string) => Client[]
  onClose: () => void
  onSave: (draft: BookingDraft) => Promise<{ error: string | null }>
  onDelete?: (id: string) => Promise<void>
  existingBooking?: Booking | null
}

function toLocalInput(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export default function BookingModal({ open, draft, barbers, searchClients, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<BookingDraft | null>(draft)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Client[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setForm(draft)
    setError(null)
    setConfirmDelete(false)
  }, [draft])

  if (!open || !form) return null

  const update = (patch: Partial<BookingDraft>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const handleNameChange = (field: 'firstName' | 'lastName', value: string) => {
    update({ [field]: value, clientId: null } as Partial<BookingDraft>)
    const q = field === 'firstName' ? value : form.firstName
    setSuggestions(q.length >= 2 ? searchClients(q).slice(0, 5) : [])
  }

  const pickSuggestion = (c: Client) => {
    update({ clientId: c.id, firstName: c.first_name, lastName: c.last_name, phone: c.phone })
    setSuggestions([])
  }

  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      setError('Unesi ime klijenta.')
      return
    }
    setSaving(true)
    const res = await onSave(form)
    setSaving(false)
    if (res.error) {
      setError(res.error)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-pop dark:bg-ink-800 sm:max-w-lg sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-ink-700 dark:bg-ink-800/95">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">
            {form.id ? 'Uredi termin' : 'Novi termin'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">Frizer</label>
            <select
              value={form.barberId}
              onChange={(e) => update({ barberId: e.target.value })}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                <User size={12} /> Ime
              </label>
              <input
                value={form.firstName}
                onChange={(e) => handleNameChange('firstName', e.target.value)}
                placeholder="Ime"
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white shadow-pop dark:border-ink-600 dark:bg-ink-800">
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickSuggestion(c)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-brass-50 dark:hover:bg-ink-700"
                    >
                      <span className="font-medium text-ink-900 dark:text-ink-50">
                        {c.first_name} {c.last_name}
                      </span>
                      <span className="ml-2 text-xs text-ink-400">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">Prezime</label>
              <input
                value={form.lastName}
                onChange={(e) => handleNameChange('lastName', e.target.value)}
                placeholder="Prezime"
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <Phone size={12} /> Broj telefona
            </label>
            <input
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="091 234 5678"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <Scissors size={12} /> Usluga
            </label>
            <input
              value={form.service}
              onChange={(e) => update({ service: e.target.value })}
              placeholder="npr. Pramenovi + šišanje + Olaplex"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">Napomena</label>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={2}
              placeholder="Vidljivo na kalendaru ako ima mjesta"
              className="w-full resize-none rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <Clock size={12} /> Vrijeme
            </label>
            <input
              type="datetime-local"
              value={toLocalInput(form.start)}
              onChange={(e) => update({ start: new Date(e.target.value) })}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <Palette size={12} /> Boja
            </label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => update({ color: c.value })}
                  title={c.label}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    form.color === c.value ? 'scale-110 border-ink-900 dark:border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => update({ color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-full border border-ink-200 dark:border-ink-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(e) => update({ reminderEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-ink-300 text-brass-600 focus:ring-brass-500"
            />
            <Bell size={14} /> Podsjetnik za ovaj termin
          </label>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-ink-100 bg-white px-5 py-4 dark:border-ink-700 dark:bg-ink-800">
          {form.id && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500">Sigurno obrisati?</span>
                <button
                  onClick={async () => {
                    await onDelete(form.id!)
                    onClose()
                  }}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Da, obriši
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm text-ink-500 hover:underline">
                  Odustani
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 size={16} /> Obriši
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700">
              Odustani
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-brass-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-brass-700 disabled:opacity-60"
            >
              {saving ? 'Spremanje…' : 'Spremi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
