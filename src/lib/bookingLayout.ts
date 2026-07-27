import type { Booking } from '@/types'
import { minutesFromDayStart, DEFAULT_BOOKING_MINUTES } from '@/lib/dateUtils'

export interface BookingLayoutSlot {
  id: string
  col: number
  cols: number
}

/**
 * Bez vremena završetka svaki termin je "točka" na vremenskoj crti koja se
 * prikazuje kao okvir fiksne visine. Kad se dva ili više termina nalaze
 * dovoljno blizu da bi se njihovi okviri preklopili, ova funkcija ih
 * raspoređuje jedan pored drugog (kao u Google Calendaru) umjesto da se
 * vizualno preklapaju.
 */
export function layoutBookings(bookings: Booking[], durationMinutes = DEFAULT_BOOKING_MINUTES): Map<string, BookingLayoutSlot> {
  const items = bookings
    .map((b) => ({ id: b.id, start: minutesFromDayStart(new Date(b.start_time)) }))
    .sort((a, b) => a.start - b.start)

  const result = new Map<string, BookingLayoutSlot>()
  let cluster: typeof items = []
  let clusterMaxEnd = -Infinity

  const flush = () => {
    if (!cluster.length) return
    const colEnds: number[] = []
    const assigned: Record<string, number> = {}
    for (const it of cluster) {
      let placed = false
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= it.start) {
          colEnds[c] = it.start + durationMinutes
          assigned[it.id] = c
          placed = true
          break
        }
      }
      if (!placed) {
        colEnds.push(it.start + durationMinutes)
        assigned[it.id] = colEnds.length - 1
      }
    }
    const cols = colEnds.length
    for (const it of cluster) result.set(it.id, { id: it.id, col: assigned[it.id], cols })
    cluster = []
  }

  for (const it of items) {
    if (cluster.length && it.start >= clusterMaxEnd) {
      flush()
      clusterMaxEnd = -Infinity
    }
    cluster.push(it)
    clusterMaxEnd = Math.max(clusterMaxEnd, it.start + durationMinutes)
  }
  flush()

  return result
}
