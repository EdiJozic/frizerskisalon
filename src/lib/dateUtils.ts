import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format
} from 'date-fns'
import { hr } from 'date-fns/locale'

export const DAY_START_HOUR = 7
export const DAY_END_HOUR = 21
export const PX_PER_MINUTE = 1.1 // grid density; ~66px per hour

export function minutesFromDayStart(date: Date) {
  return (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes()
}

export function totalGridMinutes() {
  return (DAY_END_HOUR - DAY_START_HOUR) * 60
}

export function weekRange(date: Date) {
  return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) }
}

export function dayRange(date: Date) {
  return { start: startOfDay(date), end: endOfDay(date) }
}

export function monthRange(date: Date) {
  return { start: startOfMonth(date), end: endOfMonth(date) }
}

export function daysInWeek(date: Date) {
  const { start, end } = weekRange(date)
  return eachDayOfInterval({ start, end })
}

export function daysInMonthGrid(date: Date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function fmtTime(date: Date | string) {
  return format(new Date(date), 'HH:mm')
}

export function fmtDayLabel(date: Date) {
  return format(date, 'EEE d.M.', { locale: hr })
}

export function fmtFullDate(date: Date) {
  return format(date, "EEEE, d. MMMM yyyy.", { locale: hr })
}

export function fmtMonthLabel(date: Date) {
  return format(date, 'LLLL yyyy.', { locale: hr })
}

export function snapToGrid(minutes: number, step = 5) {
  return Math.round(minutes / step) * step
}

export function clampToGrid(minutes: number) {
  return Math.min(Math.max(minutes, 0), totalGridMinutes())
}
