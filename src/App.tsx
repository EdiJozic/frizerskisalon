import { useEffect, useMemo, useState } from 'react'
import { addDays, addWeeks, addMonths, isSameDay } from 'date-fns'
import { WifiOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import Login from '@/pages/Login'
import TopBar from '@/components/TopBar'
import TimeGrid, { GridColumn } from '@/components/TimeGrid'
import MonthView from '@/components/MonthView'
import BookingModal, { BookingDraft } from '@/components/BookingModal'
import BarberManager from '@/components/BarberManager'
import { useBarbers } from '@/hooks/useBarbers'
import { useClients } from '@/hooks/useClients'
import { useBookings } from '@/hooks/useBookings'
import { exportBackup, importBackup } from '@/lib/backup'
import { printSchedule } from '@/lib/print'
import { dayRange, weekRange, monthRange, daysInWeek } from '@/lib/dateUtils'
import type { Booking, CalendarViewMode } from '@/types'
import { SERVICE_COLORS } from '@/types'

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export default function App() {
  const { session, profile, loading, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const online = useOnlineStatus()

  const salonId = profile?.salon_id ?? null

  const [view, setView] = useState<CalendarViewMode>('week')
  const [cursorDate, setCursorDate] = useState(new Date())
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all')
  const [barberManagerOpen, setBarberManagerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<BookingDraft | null>(null)

  const { barbers, addBarber, updateBarber, removeBarber } = useBarbers(salonId)

  useEffect(() => {
    if (barbers.length && selectedBarberId === 'all' && view !== 'day') {
      setSelectedBarberId(barbers[0].id)
    }
  }, [barbers, selectedBarberId, view])

  const range = useMemo(() => {
    if (view === 'day') return dayRange(cursorDate)
    if (view === 'week') return weekRange(cursorDate)
    return monthRange(cursorDate)
  }, [view, cursorDate])

  const { bookings, hasOverlap, createBooking, updateBooking, deleteBooking } = useBookings(salonId, range.start, range.end)
  const { searchClients, findOrCreateClient } = useClients(salonId)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
        <p className="text-sm text-ink-400">Učitavanje…</p>
      </div>
    )
  }

  if (!session) return <Login />
  if (!profile?.salon_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 text-center dark:bg-ink-950">
        <p className="text-sm text-ink-500">Postavljanje salona u tijeku… Osvježi stranicu za trenutak.</p>
      </div>
    )
  }

  const navigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) {
      setCursorDate(new Date())
      return
    }
    if (view === 'day') setCursorDate((d) => addDays(d, dir))
    else if (view === 'week') setCursorDate((d) => addWeeks(d, dir))
    else setCursorDate((d) => addMonths(d, dir))
  }

  const openCreateDraft = (barberId: string, date: Date, startMin: number, endMin: number) => {
    const start = new Date(date)
    start.setHours(7, 0, 0, 0)
    const startAt = new Date(start.getTime() + startMin * 60000)
    const endAt = new Date(start.getTime() + endMin * 60000)
    setDraft({
      barberId,
      clientId: null,
      firstName: '',
      lastName: '',
      phone: '',
      service: '',
      description: '',
      color: SERVICE_COLORS[0].value,
      start: startAt,
      end: endAt,
      reminderEnabled: false
    })
    setModalOpen(true)
  }

  const openEditDraft = (b: Booking) => {
    setDraft({
      id: b.id,
      barberId: b.barber_id,
      clientId: b.client_id,
      firstName: b.client_first_name,
      lastName: b.client_last_name,
      phone: b.client_phone,
      service: b.service,
      description: b.description ?? '',
      color: b.color,
      start: new Date(b.start_time),
      end: new Date(b.end_time),
      reminderEnabled: b.reminder_enabled
    })
    setModalOpen(true)
  }

  const handleSaveDraft = async (d: BookingDraft) => {
    const client = await findOrCreateClient(d.firstName.trim(), d.lastName.trim(), d.phone.trim())
    const payload = {
      barber_id: d.barberId,
      client_id: client?.id ?? d.clientId,
      client_first_name: d.firstName.trim(),
      client_last_name: d.lastName.trim(),
      client_phone: d.phone.trim(),
      service: d.service.trim(),
      description: d.description.trim() || null,
      color: d.color,
      start_time: d.start.toISOString(),
      end_time: d.end.toISOString(),
      reminder_enabled: d.reminderEnabled
    }
    if (d.id) return updateBooking(d.id, payload)
    return createBooking(payload)
  }

  const handleCommitMove = async (booking: Booking, columnKeyIsBarberOrDay: string, newStart: Date, newEnd: Date) => {
    // in day view columns are barbers; in week view columns are days (barber fixed)
    const barberId = view === 'day' ? columnKeyIsBarberOrDay : booking.barber_id
    if (hasOverlap(barberId, newStart.toISOString(), newEnd.toISOString(), booking.id)) return
    await updateBooking(booking.id, { barber_id: barberId, start_time: newStart.toISOString(), end_time: newEnd.toISOString() })
  }

  const columns: GridColumn[] =
    view === 'day'
      ? barbers.map((b) => ({ key: b.id, label: b.name, date: cursorDate, color: b.color }))
      : view === 'week'
      ? daysInWeek(cursorDate).map((d) => ({
          key: d.toISOString(),
          label: d.toLocaleDateString('hr-HR', { weekday: 'short' }),
          sublabel: d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric' }),
          date: d
        }))
      : []

  const bookingsByColumn = new Map<string, Booking[]>()
  if (view === 'day') {
    for (const col of columns) bookingsByColumn.set(col.key, bookings.filter((b) => b.barber_id === col.key))
  } else if (view === 'week') {
    for (const col of columns) {
      bookingsByColumn.set(
        col.key,
        bookings.filter((b) => b.barber_id === selectedBarberId && isSameDay(new Date(b.start_time), col.date))
      )
    }
  }

  const handleExport = () => salonId && exportBackup(salonId)
  const handleImport = async (file: File) => {
    if (!salonId) return
    await importBackup(salonId, file)
  }
  const handlePrint = () => {
    const title = view === 'day' ? 'Dnevni raspored' : view === 'week' ? 'Tjedni raspored' : 'Mjesečni raspored'
    printSchedule(title, bookings, barbers)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-50 dark:bg-ink-950">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-brass-600 py-1.5 text-xs font-medium text-white">
          <WifiOff size={13} /> Nema internetske veze — prikazuju se zadnji spremljeni podaci.
        </div>
      )}

      <TopBar
        view={view}
        setView={setView}
        cursorDate={cursorDate}
        onNavigate={navigate}
        barbers={barbers}
        selectedBarberId={selectedBarberId}
        onSelectBarber={setSelectedBarberId}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenBarberManager={() => setBarberManagerOpen(true)}
        onExport={handleExport}
        onImport={handleImport}
        onPrint={handlePrint}
        onSignOut={signOut}
        salonName="Salon Raspored"
      />

      <div className="min-h-0 flex-1">
        {view === 'month' ? (
          <MonthView
            month={cursorDate}
            bookings={bookings.filter((b) => selectedBarberId === 'all' || b.barber_id === selectedBarberId)}
            onSelectDay={(d) => {
              setCursorDate(d)
              setView('day')
            }}
          />
        ) : (
         <TimeGrid
  columns={columns}
  bookingsByColumn={bookingsByColumn}
  onCreateRequest={(columnKey, date, start, end) =>
    openCreateDraft(
      view === 'week' ? selectedBarberId : columnKey,
      date,
      start,
      end
    )
  }
  onOpenBooking={openEditDraft}
  onCommitMove={handleCommitMove}
  isToday={(d) => isSameDay(d, new Date())}
/>
        )}
      </div>

      <BookingModal
        open={modalOpen}
        draft={draft}
        barbers={barbers}
        searchClients={searchClients}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDraft}
        onDelete={async (id) => deleteBooking(id)}
      />

      <BarberManager
        open={barberManagerOpen}
        barbers={barbers}
        onClose={() => setBarberManagerOpen(false)}
        onAdd={addBarber}
        onUpdate={updateBarber}
        onRemove={removeBarber}
      />
    </div>
  )
}
