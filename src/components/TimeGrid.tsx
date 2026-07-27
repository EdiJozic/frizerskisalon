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
const GRID_STEP_MIN = 15
const LONG_PRESS_MS = 220
const MOVE_CANCEL_PX = 10

// prati pending long-press gestu preko window listenera, da ne ovisi o tome
// je li ciljni element "ukrao" bubbling (npr. kad je pod prstom booking blok)
function trackPendingPointer(
  pointerId: number,
  startX: number,
  startY: number,
  onMoveTick: (x: number, y: number) => void,
  onCancel: () => void
) {
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    onMoveTick(ev.clientX, ev.clientY)
    if (Math.abs(ev.clientX - startX) > MOVE_CANCEL_PX || Math.abs(ev.clientY - startY) > MOVE_CANCEL_PX) {
      onCancel()
    }
  }
  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    cleanup()
  }
  const cleanup = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  return cleanup
}

export default function TimeGrid({ columns, bookingsByColumn, onCreateRequest, onOpenBooking, onCommitMove, isToday }: Props) {
  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null)
  const [dragMove, setDragMove] = useState<DragMoveState | null>(null)
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const isScrolling = useRef(false)

  // pending long-press state (za touch kreiranje/pomicanje termina)
  const pendingRef = useRef<{ cleanup: () => void; timer: number } | null>(null)

  const clearPending = () => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer)
      pendingRef.current.cleanup()
      pendingRef.current = null
    }
  }

  const yToMinutes = (columnKey: string, clientY: number) => {
    const el = colRefs.current[columnKey]
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const rawMin = (clientY - rect.top) / PX_PER_MINUTE
    return clampToGrid(snapToGrid(rawMin, GRID_STEP_MIN))
  }

  const beginCreateDrag = (columnKey: string, clientY: number, pointerId: number) => {
    const startMinute = yToMinutes(columnKey, clientY)
    setDragCreate({ columnKey, startMinute, currentMinute: startMinute + GRID_STEP_MIN })
    colRefs.current[columnKey]?.setPointerCapture(pointerId)
  }

  const handleColPointerDown = (columnKey: string, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-booking-block]')) return

    isScrolling.current = false
    clearPending()

    if (e.pointerType === 'mouse') {
      // miš nema konflikt sa scrollom, kreni odmah
      beginCreateDrag(columnKey, e.clientY, e.pointerId)
      return
    }

    // touch/pen: čekaj kratko da vidimo je li ovo scroll ili namjerni pritisak
    let lastY = e.clientY
    const timer = window.setTimeout(() => {
      if (!isScrolling.current) beginCreateDrag(columnKey, lastY, e.pointerId)
      clearPending()
    }, LONG_PRESS_MS)

    const cleanup = trackPendingPointer(
      e.pointerId,
      e.clientX,
      e.clientY,
      (_x, y) => { lastY = y },
      () => { isScrolling.current = true }
    )

    pendingRef.current = { cleanup, timer }
  }

  const handleColPointerMove = (columnKey: string, e: React.PointerEvent) => {
    if (dragCreate && dragCreate.columnKey === columnKey) {
      const m = yToMinutes(columnKey, e.clientY)
      setDragCreate((s) => (s ? { ...s, currentMinute: m } : s))
    }
    if (dragMove && dragMove.columnKey === columnKey) {
      const deltaMin = snapToGrid((e.clientY - dragMove.pointerStartY) / PX_PER_MINUTE, GRID_STEP_MIN)
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
        const newEnd = clampToGrid(
          Math.max(dragMove.originStartMin + GRID_STEP_MIN, dragMove.originEndMin + deltaMin)
        )
        setDragMove((s) => (s ? { ...s, liveEndMin: newEnd } : s))
      }
    }
  }

  const finishCreate = () => {
    if (isScrolling.current || !dragCreate) {
      setDragCreate(null)
      return
    }
    const col = columns.find((c) => c.key === dragCreate.columnKey)
    if (col) {
      const start = Math.min(dragCreate.startMinute, dragCreate.currentMinute)
      const end = Math.max(dragCreate.startMinute, dragCreate.currentMinute, start + GRID_STEP_MIN)
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
    clearPending()
    if (dragCreate) finishCreate()
    if (dragMove) finishMove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragCreate, dragMove])

  const startMoveBooking = (booking: Booking, columnKey: string, e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.stopPropagation()

    const begin = (pointerId: number, target: HTMLElement) => {
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
      target.setPointerCapture(pointerId)
    }

    // resize se hvata za mali "grip" - siguran je odmah i na touchu
    if (e.pointerType === 'mouse' || mode === 'resize') {
      begin(e.pointerId, e.currentTarget as HTMLElement)
      return
    }

    // pomicanje cijelog termina na touchu -> long press, da ne otima scroll
    clearPending()
    const target = e.currentTarget as HTMLElement
    const timer = window.setTimeout(() => {
      if (!isScrolling.current) begin(e.pointerId, target)
      clearPending()
    }, LONG_PRESS_MS)

    const cleanup = trackPendingPointer(
      e.pointerId,
      e.clientX,
      e.clientY,
      () => {},
      () => { isScrolling.current = true }
    )

    pendingRef.current = { cleanup, timer }
  }

  const gridHeight = totalGridMinutes() * PX_PER_MINUTE

  return (
    <div
      className="h-full min-h-0 overflow-auto overscroll-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="flex" style={{ width: 'max-content', minWidth: '100%' }}>
        {/* Satnica - sticky lijevo */}
        <div className="sticky left-0 z-40 w-14 shrink-0 select-none border-r border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900">
          <div className="sticky top-0 z-50 h-12 border-b border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900" />
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

        {/* Kolone dana */}
        {columns.map((col) => {
          const dayBookings = bookingsByColumn.get(col.key) ?? []
          const todayFlag = isToday?.(col.date)
          return (
            <div
              key={col.key}
              className="w-[220px] shrink-0 snap-start border-r border-ink-200 last:border-r-0 dark:border-ink-700"
            >
              <div
                className={`sticky top-0 z-30 flex h-12 flex-col items-center justify-center border-b border-ink-200 bg-white px-1 text-center dark:border-ink-700 dark:bg-ink-900 ${
                  todayFlag ? 'bg-brass-50 dark:bg-brass-950/40' : ''
                }`}
              >
                <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{col.label}</span>
                {col.sublabel && (
                  <span className="text-[11px] text-ink-400 dark:text-ink-500">{col.sublabel}</span>
                )}
              </div>

              <div
                ref={(el) => (colRefs.current[col.key] = el)}
                className="relative bg-white dark:bg-ink-900"
                style={{ height: gridHeight, touchAction: 'pan-y' }}
                onPointerDown={(e) => handleColPointerDown(col.key, e)}
                onPointerMove={(e) => handleColPointerMove(col.key, e)}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute left-0 right-0 border-t border-ink-100 dark:border-ink-800"
                    style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE }}
                  />
                ))}

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
                        borderColor: b.color,
                        touchAction: 'pan-y'
                      }}
                    >
                      <p className="truncate text-[12px] font-semibold leading-tight text-ink-900 dark:text-ink-50">
                        {format(new Date(b.start_time), 'HH:mm')}{' '}
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

                {dragCreate && dragCreate.columnKey === col.key && (
                  <div
                    className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg border-2 border-dashed border-brass-500 bg-brass-100/60 dark:bg-brass-500/20"
                    style={{
                      top: Math.min(dragCreate.startMinute, dragCreate.currentMinute) * PX_PER_MINUTE,
                      height: Math.max(Math.abs(dragCreate.currentMinute - dragCreate.startMinute), GRID_STEP_MIN) * PX_PER_MINUTE
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