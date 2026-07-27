import { isSameMonth, isSameDay, format } from 'date-fns'
import { hr } from 'date-fns/locale'
import type { Booking } from '@/types'
import { daysInMonthGrid } from '@/lib/dateUtils'

interface Props {
  month: Date
  bookings: Booking[]
  onSelectDay: (date: Date) => void
}

const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']

export default function MonthView({ month, bookings, onSelectDay }: Props) {
  const days = daysInMonthGrid(month)
  const today = new Date()

  const bookingsForDay = (day: Date) => bookings.filter((b) => isSameDay(new Date(b.start_time), day))

  return (
    <div className="flex h-full flex-col p-2 sm:p-4">
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((day) => {
          const dayBookings = bookingsForDay(day)
          const inMonth = isSameMonth(day, month)
          const isToday = isSameDay(day, today)
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`flex min-h-[72px] flex-col items-start rounded-lg border p-1.5 text-left transition sm:min-h-[100px] sm:p-2 ${
                inMonth
                  ? 'border-ink-100 bg-white hover:border-brass-300 dark:border-ink-700 dark:bg-ink-900'
                  : 'border-transparent bg-ink-50/50 text-ink-300 dark:bg-ink-900/30'
              }`}
            >
              <span
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? 'bg-brass-600 text-white' : inMonth ? 'text-ink-700 dark:text-ink-200' : 'text-ink-300 dark:text-ink-600'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                {dayBookings.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: b.color }}
                  >
                    {format(new Date(b.start_time), 'HH:mm')} {b.client_first_name}
                  </span>
                ))}
                {dayBookings.length > 3 && (
                  <span className="text-[10px] font-medium text-ink-400">+{dayBookings.length - 3} više</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-ink-400 sm:hidden">{format(month, 'LLLL yyyy.', { locale: hr })}</p>
    </div>
  )
}
