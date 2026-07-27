import { useState } from 'react'
import { X, Plus, Trash2, Pencil, Check } from 'lucide-react'
import type { Barber } from '@/types'
import { SERVICE_COLORS } from '@/types'

interface Props {
  open: boolean
  barbers: Barber[]
  onClose: () => void
  onAdd: (name: string, color: string) => Promise<void>
  onUpdate: (id: string, patch: Partial<Barber>) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export default function BarberManager({ open, barbers, onClose, onAdd, onUpdate, onRemove }: Props) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-pop dark:bg-ink-800 sm:max-w-md sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-4 dark:border-ink-700 dark:bg-ink-800">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Frizeri</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 px-5 py-4">
          {barbers.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-700">
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
              {editingId === b.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded border border-ink-200 bg-white px-2 py-1 text-sm dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-ink-800 dark:text-ink-100">{b.name}</span>
              )}

              <select
                value={b.color}
                onChange={(e) => onUpdate(b.id, { color: e.target.value })}
                className="rounded border border-ink-200 bg-white px-1 py-1 text-xs dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
              >
                {SERVICE_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              {editingId === b.id ? (
                <button
                  onClick={async () => {
                    await onUpdate(b.id, { name: editName })
                    setEditingId(null)
                  }}
                  className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  <Check size={16} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(b.id)
                    setEditName(b.name)
                  }}
                  className="rounded p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700"
                >
                  <Pencil size={16} />
                </button>
              )}
              <button onClick={() => onRemove(b.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ime novog frizera"
              className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-ink-600 dark:bg-ink-900 dark:text-ink-50"
            />
            <button
              onClick={async () => {
                if (!newName.trim()) return
                await onAdd(newName.trim(), SERVICE_COLORS[barbers.length % SERVICE_COLORS.length].value)
                setNewName('')
              }}
              className="flex items-center gap-1 rounded-lg bg-brass-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brass-700"
            >
              <Plus size={16} /> Dodaj
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
