import { useRef, useState, useEffect } from 'react'
import { addMinutes, format } from 'date-fns'
import type { Booking } from '@/types'
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  PX_PER_MINUTE,
  DEFAULT_BOOKING_MINUTES,
  minutesFromDayStart,
  totalGridMinutes,
  snapToGrid,
  clampToGrid
} from '@/lib/dateUtils'
import { layoutBookings } from '@/lib/bookingLayout'

export interface GridColumn {
  key: string
  label: string
  sublabel?: string
  date: Date
  color?: string
}

interface LiveDrag {
  bookingId: string
  originColumnKey: string
  targetColumnKey: string
  liveStartMin: number
  moved: boolean
}

interface Props {
  columns: GridColumn[]
  bookingsByColumn: Map<string, Booking[]>
  onCreateRequest: (columnKey: string, date: Date, startMinutes: number) => void
  onOpenBooking: (booking: Booking) => void
  onCommitMove: (booking: Booking, columnKey: string, newStart: Date) => void
  isToday?: (date: Date) => boolean
}

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i)
const DRAG_THRESHOLD_PX = 6

export default function TimeGrid({ columns, bookingsByColumn, onCreateRequest, onOpenBooking, onCommitMove, isToday }: Props) {
  const colBodyRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [drag, setDrag] = useState<LiveDrag | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originStartMin: number
    booking: Booking
    targetColumnKey: string
    liveStartMin: number
    moved: boolean
  } | null>(null)

  const findColumnAt = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY)
    const match = el?.closest<HTMLElement>('[data-col-key]')
    return match?.getAttribute('data-col-key') ?? null
  }

  const minutesForColumnAtY = (columnKey: string, clientY: number) => {
    const el = colBodyRefs.current[columnKey]
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return clampToGrid(snapToGrid((clientY - rect.top) / PX_PER_MINUTE, 5))
  }

  const startDrag = (booking: Booking, columnKey: string, e: React.PointerEvent) => {
    e.stopPropagation()
    const originStartMin = minutesFromDayStart(new Date(booking.start_time))
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originStartMin,
      booking,
      targetColumnKey: columnKey,
      liveStartMin: originStartMin,
      moved: false
    }
    setDrag({ bookingId: booking.id, originColumnKey: columnKey, targetColumnKey: columnKey, liveStartMin: originStartMin, moved: false })
  }

  // Window-level listeners so a drag continues smoothly across columns and
  // release always fires, regardless of what element ends up under the
  // finger — using onPointerUp on the box itself would miss releases that
  // happen after the pointer has moved elsewhere.
  useEffect(() => {
    if (!drag) return

    const handleMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const dx = Math.abs(e.clientX - d.startX)
      const dy = Math.abs(e.clientY - d.startY)
      if (!d.moved && dx <= DRAG_THRESHOLD_PX && dy <= DRAG_THRESHOLD_PX) return
      e.preventDefault()
      const targetCol = findColumnAt(e.clientX, e.clientY) ?? d.targetColumnKey
      const min = minutesForColumnAtY(targetCol, e.clientY)
      d.moved = true
      d.targetColumnKey = targetCol
      d.liveStartMin = min
      setDrag({ bookingId: d.booking.id, originColumnKey: d.targetColumnKey, targetColumnKey: targetCol, liveStartMin: min, moved: true })
    }

    const handleUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      if (d.moved) {
        const col = columns.find((c) => c.key === d.targetColumnKey)
        if (col) {
          const dayBase = new Date(col.date)
          dayBase.setHours(DAY_START_HOUR, 0, 0, 0)
          const newStart = addMinutes(dayBase, d.liveStartMin)
          onCommitMove(d.booking, d.targetColumnKey, newStart)
        }
      } else {
        onOpenBooking(d.booking)
      }
      dragRef.current = null
      setDrag(null)
    }

    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.bookingId])

  const handleColumnClick = (columnKey: string, date: Date, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-booking-block]')) return
    const startMin = minutesForColumnAtY(columnKey, e.clientY)
    onCreateRequest(columnKey, date, startMin)
  }

  const gridHeight = totalGridMinutes() * PX_PER_MINUTE
  const boxHeight = Math.max(DEFAULT_BOOKING_MINUTES * PX_PER_MINUTE, 30)

  return (
    <div className="h-full overflow-auto overscroll-contain">
      <div className="flex" style={{ minWidth: 'max-content' }}>
        {/* Hour labels — pinned to the left while columns scroll horizontally */}
        <div className="sticky left-0 z-30 w-14 shrink-0 select-none bg-ink-50 dark:bg-ink-950">
          <div className="sticky top-0 z-30 h-12 border-b border-r border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-950" />
          <div className="relative border-r border-ink-200 dark:border-ink-700" style={{ height: gridHeight }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-ink-400 dark:text-ink-500"
                style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE }}
              >
                {h}:00
              </div>
            ))}
          </div>
        </div>

        {/* Day / barber columns */}
        {columns.map((col) => {
          const dayBookings = bookingsByColumn.get(col.key) ?? []
          const layout = layoutBookings(dayBookings)
          const todayFlag = isToday?.(col.date)
          return (
            <div key={col.key} className="w-[240px] shrink-0 border-r border-ink-200 last:border-r-0 dark:border-ink-700 sm:w-[260px]">
              <div
                className={`sticky top-0 z-20 flex h-12 flex-col items-center justify-center border-b border-ink-200 bg-white px-1 text-center dark:border-ink-700 dark:bg-ink-900 ${
                  todayFlag ? 'bg-brass-50 dark:bg-brass-950/40' : ''
                }`}
              >
                <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{col.label}</span>
                {col.sublabel && <span className="text-[11px] text-ink-400 dark:text-ink-500">{col.sublabel}</span>}
              </div>

              <div
                ref={(el) => (colBodyRefs.current[col.key] = el)}
                data-col-key={col.key}
                className="relative bg-white dark:bg-ink-900"
                style={{ height: gridHeight }}
                onClick={(e) => handleColumnClick(col.key, col.date, e)}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute left-0 right-0 border-t border-ink-100 dark:border-ink-800"
                    style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE }}
                  />
                ))}

                {dayBookings.map((b) => {
                  const isDragging = drag?.bookingId === b.id
                  const isDraggingHere = isDragging && drag!.targetColumnKey === col.key
                  const isDraggingAway = isDragging && drag!.targetColumnKey !== col.key
                  if (isDraggingAway) return null

                  const startMin = isDraggingHere ? drag!.liveStartMin : minutesFromDayStart(new Date(b.start_time))
                  const top = startMin * PX_PER_MINUTE
                  const slot = layout.get(b.id)
                  const cols = isDragging ? 1 : slot?.cols ?? 1
                  const colIdx = isDragging ? 0 : slot?.col ?? 0
                  const widthPct = 100 / cols
                  const leftPct = colIdx * widthPct

                  return (
                    <div
                      key={b.id}
                      data-booking-block
                      onPointerDown={(e) => startDrag(b, col.key, e)}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute cursor-grab select-none overflow-hidden rounded-lg border px-2 py-1 text-left shadow-card active:cursor-grabbing ${
                        isDragging ? 'z-30 opacity-90 ring-2 ring-brass-400' : 'z-10'
                      }`}
                      style={{
                        top,
                        height: boxHeight,
                        left: `calc(${leftPct}% + 3px)`,
                        width: `calc(${widthPct}% - 6px)`,
                        backgroundColor: `${b.color}22`,
                        borderColor: b.color,
                        touchAction: 'none'
                      }}
                    >
                      <p className="truncate text-[12px] leading-tight text-ink-900 dark:text-ink-50">
                        <span className="font-semibold">{format(new Date(b.start_time), 'HH:mm')}</span>{' '}
                        <span className="font-medium">
                          {b.client_first_name} {b.client_last_name}
                        </span>
                      </p>
                      {boxHeight > 32 && (b.service || b.description) && (
                        <p className="truncate text-[11px] leading-tight text-ink-500 dark:text-ink-400">
                          {b.service}
                          {b.description ? ` · ${b.description}` : ''}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
