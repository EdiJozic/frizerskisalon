import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Users,
  Download,
  Upload,
  Printer,
  LogOut,
  Menu,
  Scissors
} from 'lucide-react'
import type { Barber, CalendarViewMode } from '@/types'
import { fmtFullDate, fmtMonthLabel, daysInWeek, fmtDayLabel } from '@/lib/dateUtils'

interface Props {
  view: CalendarViewMode
  setView: (v: CalendarViewMode) => void
  cursorDate: Date
  onNavigate: (dir: -1 | 0 | 1) => void
  barbers: Barber[]
  selectedBarberId: string | 'all'
  onSelectBarber: (id: string | 'all') => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onOpenBarberManager: () => void
  onExport: () => void
  onImport: (file: File) => void
  onPrint: () => void
  onSignOut: () => void
  salonName: string
}

export default function TopBar({
  view,
  setView,
  cursorDate,
  onNavigate,
  barbers,
  selectedBarberId,
  onSelectBarber,
  theme,
  onToggleTheme,
  onOpenBarberManager,
  onExport,
  onImport,
  onPrint,
  onSignOut,
  salonName
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const label =
    view === 'day' ? fmtFullDate(cursorDate) : view === 'month' ? fmtMonthLabel(cursorDate) : weekLabel(cursorDate)

  function weekLabel(date: Date) {
    const days = daysInWeek(date)
    return `${fmtDayLabel(days[0])} – ${fmtDayLabel(days[6])}`
  }

  return (
    <div className="relative z-40 flex flex-col gap-2 border-b border-ink-100 bg-white/90 px-3 py-2.5 backdrop-blur dark:border-ink-800 dark:bg-ink-900/90 sm:px-5 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brass-600 text-white">
            <Scissors size={16} />
          </div>
          <div>
            <h1 className="font-display text-sm font-semibold leading-tight text-ink-900 dark:text-ink-50 sm:text-base">
              {salonName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleTheme}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700"
            aria-label="Promijeni temu"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700"
              aria-label="Izbornik"
            >
              <Menu size={18} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-pop dark:border-ink-700 dark:bg-ink-800"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <MenuItem icon={<Users size={16} />} label="Upravljaj frizerima" onClick={onOpenBarberManager} />
                <MenuItem icon={<Printer size={16} />} label="Ispis rasporeda" onClick={onPrint} />
                <MenuItem icon={<Download size={16} />} label="Izvoz backupa (JSON)" onClick={onExport} />
                <label className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-100 dark:hover:bg-ink-700">
                  <Upload size={16} /> Uvoz backupa (JSON)
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onImport(f)
                      setMenuOpen(false)
                    }}
                  />
                </label>
                <div className="my-1 h-px bg-ink-100 dark:bg-ink-700" />
                <MenuItem icon={<LogOut size={16} />} label="Odjava" onClick={onSignOut} danger />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate(-1)}
            className="rounded-lg border border-ink-200 p-1.5 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => onNavigate(0)}
            className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            Danas
          </button>
          <button
            onClick={() => onNavigate(1)}
            className="rounded-lg border border-ink-200 p-1.5 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            <ChevronRight size={16} />
          </button>
          <span className="ml-1 text-sm font-medium capitalize text-ink-700 dark:text-ink-200">{label}</span>
        </div>

        <div className="flex items-center gap-2">
          {view !== 'day' && (
            <select
              value={selectedBarberId}
              onChange={(e) => onSelectBarber(e.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs font-medium text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  view === v ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-600 dark:text-white' : 'text-ink-400'
                }`}
              >
                {v === 'day' ? 'Dan' : v === 'week' ? 'Tjedan' : 'Mjesec'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-700 ${
        danger ? 'text-red-600' : 'text-ink-700 dark:text-ink-100'
      }`}
    >
      {icon} {label}
    </button>
  )
}
