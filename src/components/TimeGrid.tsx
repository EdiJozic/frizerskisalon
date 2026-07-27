import { useRef, useState, useCallback } from 'react'
import { addMinutes, format } from 'date-fns'
import type { Booking } from '@/types'
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  PX_PER_MINUTE,
  minutesFromDayStart,
  totalGridMinutes,
  snapToGrid,
  clampToGrid
} from '@/lib/dateUtils'

export interface GridColumn {
  key: string
  label: string
  sublabel?: string
  date: Date
  color?: string
}

interface DragCreateState {
  columnKey: string
  startMinute: number
  currentMinute: number
}

interface DragMoveState {
  booking: Booking
  mode: 'move' | 'resize'
  originStartMin: number
  originEndMin: number
  pointerStartY: number
  columnKey: string
  liveStartMin: number
  liveEndMin: number
}

interface Props {
  columns: GridColumn[]
  bookingsByColumn: Map<string, Booking[]>
  onCreateRequest: (columnKey: string, date: Date, startMinutes: number, endMinutes: number) => void
  onOpenBooking: (booking: Booking) => void
  onCommitMove: (booking: Booking, columnKey: string, newStart: Date, newEnd: Date) => void
  isToday?: (date: Date) => boolean
}

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i)

export default function TimeGrid({ columns, bookingsByColumn, onCreateRequest, onOpenBooking, onCommitMove, isToday }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null)
  const [dragMove, setDragMove] = useState<DragMoveState | null>(null)
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const yToMinutes = (columnKey: string, clientY: number) => {
    const el = colRefs.current[columnKey]
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const rawMin = (clientY - rect.top) / PX_PER_MINUTE
    return clampToGrid(snapToGrid(rawMin, 5))
  }

  const handleColPointerDown = (columnKey: string, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-booking-block]')) return
    const startMinute = yToMinutes(columnKey, e.clientY)
    setDragCreate({ columnKey, startMinute, currentMinute: startMinute + 15 })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleColPointerMove = (columnKey: string, e: React.PointerEvent) => {
    if (dragCreate && dragCreate.columnKey === columnKey) {
      const m = yToMinutes(columnKey, e.clientY)
      setDragCreate((s) => (s ? { ...s, currentMinute: m } : s))
    }
    if (dragMove && dragMove.columnKey === columnKey) {
      const deltaMin = snapToGrid((e.clientY - dragMove.pointerStartY) / PX_PER_MINUTE, 5)
      if (dragMove.mode === 'move') {
        const duration = dragMove.originEndMin - dragMove.originStartMin
        let newStart = clampToGrid(dragMove.originStartMin + deltaMin)
        let newEnd = newStart + duration
        if (newEnd > totalGridMinutes()) {
          newEnd = totalGridMinutes()
          newStart = newEnd - duration
        }
        setDragMove((s) => (s ? { ...s, liveStartMin: newStart, liveEndMin: newEnd } : s))
      } else {
        const newEnd = clampToGrid(Math.max(dragMove.originStartMin + 10, dragMove.originEndMin + deltaMin))
        setDragMove((s) => (s ? { ...s, liveEndMin: newEnd } : s))
      }
    }
  }

  const finishCreate = () => {
    if (!dragCreate) return
    const col = columns.find((c) => c.key === dragCreate.columnKey)
    if (col) {
      const start = Math.min(dragCreate.startMinute, dragCreate.currentMinute)
      const end = Math.max(dragCreate.startMinute, dragCreate.currentMinute, start + 15)
      onCreateRequest(dragCreate.columnKey, col.date, start, end)
    }
    setDragCreate(null)
  }

  const finishMove = () => {
    if (!dragMove) return
    const col = columns.find((c) => c.key === dragMove.columnKey)
    if (col) {
      const dayBase = new Date(col.date)
      dayBase.setHours(DAY_START_HOUR, 0, 0, 0)
      const newStart = addMinutes(dayBase, dragMove.liveStartMin)
      const newEnd = addMinutes(dayBase, dragMove.liveEndMin)
      onCommitMove(dragMove.booking, dragMove.columnKey, newStart, newEnd)
    }
    setDragMove(null)
  }

  const handlePointerUp = useCallback(() => {
    if (dragCreate) finishCreate()
    if (dragMove) finishMove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragCreate, dragMove])

  const startMoveBooking = (booking: Booking, columnKey: string, e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.stopPropagation()
    const s = minutesFromDayStart(new Date(booking.start_time))
    const en = minutesFromDayStart(new Date(booking.end_time))
    setDragMove({
      booking,
      mode,
      originStartMin: s,
      originEndMin: en,
      pointerStartY: e.clientY,
      columnKey,
      liveStartMin: s,
      liveEndMin: en
    })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const gridHeight = totalGridMinutes() * PX_PER_MINUTE

  return (
    <div className="flex h-full min-h-0">
      {/* Hour labels */}
      <div className="w-14 shrink-0 select-none border-r border-ink-200 dark:border-ink-700">
        <div className="h-12 border-b border-ink-200 dark:border-ink-700" />
        <div style={{ height: gridHeight }} className="relative">
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

      {/* Columns */}
      <div className="flex min-w-0 flex-1 overflow-x-auto snap-x snap-mandatory" onPointerUp={handlePointerUp} onPointerLeave={() => {}}>
        {columns.map((col) => {
          const dayBookings = bookingsByColumn.get(col.key) ?? []
          const todayFlag = isToday?.(col.date)
          return (
            <div
              key={col.key}
              className="min-w-[220px] flex-1 snap-start border-r border-ink-200 last:border-r-0 dark:border-ink-700"
            >
              <div
                className={`flex h-12 flex-col items-center justify-center border-b border-ink-200 px-1 text-center dark:border-ink-700 ${
                  todayFlag ? 'bg-brass-50 dark:bg-brass-950/40' : ''
                }`}
              >
                <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{col.label}</span>
                {col.sublabel && <span className="text-[11px] text-ink-400 dark:text-ink-500">{col.sublabel}</span>}
              </div>
              <div
                ref={(el) => (colRefs.current[col.key] = el)}
                className="relative touch-none bg-white dark:bg-ink-900"
                style={{ height: gridHeight }}
                onPointerDown={(e) => handleColPointerDown(col.key, e)}
                onPointerMove={(e) => handleColPointerMove(col.key, e)}
              >
                {/* hour gridlines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute left-0 right-0 border-t border-ink-100 dark:border-ink-800"
                    style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE }}
                  />
                ))}

                {/* existing bookings */}
                {dayBookings.map((b) => {
                  const isDragging = dragMove?.booking.id === b.id
                  const startMin = isDragging ? dragMove!.liveStartMin : minutesFromDayStart(new Date(b.start_time))
                  const endMin = isDragging ? dragMove!.liveEndMin : minutesFromDayStart(new Date(b.end_time))
                  const top = startMin * PX_PER_MINUTE
                  const height = Math.max((endMin - startMin) * PX_PER_MINUTE, 18)
                  return (
                    <div
                      key={b.id}
                      data-booking-block
                      onPointerDown={(e) => startMoveBooking(b, col.key, e, 'move')}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!dragMove) onOpenBooking(b)
                      }}
                      className={`group absolute left-1 right-1 cursor-grab overflow-hidden rounded-lg border px-2 py-1 text-left shadow-card active:cursor-grabbing ${
                        isDragging ? 'z-20 opacity-90 ring-2 ring-brass-400' : 'z-10'
                      }`}
                      style={{
                        top,
                        height,
                        backgroundColor: `${b.color}22`,
                        borderColor: b.color
                      }}
                    >
                      <p className="truncate text-[12px] font-semibold leading-tight text-ink-900 dark:text-ink-50">
  {format(new Date(b.start_time), 'HH:mm')}{" "}
  <span className="font-bold">
    {b.client_first_name} {b.client_last_name}
  </span>
</p>
                      {height > 46 && (
                        <p className="truncate text-[11px] leading-tight text-ink-500 dark:text-ink-400">
                          {b.service}
                          {b.description ? ` · ${b.description}` : ''}
                        </p>
                      )}
                      <div
                        onPointerDown={(e) => startMoveBooking(b, col.key, e, 'resize')}
                        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
                      >
                        <div className="mx-auto mt-1 h-1 w-8 rounded-full bg-ink-400/60 dark:bg-ink-300/60" />
                      </div>
                    </div>
                  )
                })}

                {/* live drag-to-create preview */}
                {dragCreate && dragCreate.columnKey === col.key && (
                  <div
                    className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg border-2 border-dashed border-brass-500 bg-brass-100/60 dark:bg-brass-500/20"
                    style={{
                      top: Math.min(dragCreate.startMinute, dragCreate.currentMinute) * PX_PER_MINUTE,
                      height: Math.max(Math.abs(dragCreate.currentMinute - dragCreate.startMinute), 15) * PX_PER_MINUTE
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
