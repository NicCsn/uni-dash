import type { CalendarEvent } from '../types'

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dateStr = formatDate(date)
  const result: CalendarEvent[] = []
  for (const ev of events) {
    if (ev.recurrence === 'none') {
      if (ev.date === dateStr) result.push(ev)
    } else if (ev.recurrence === 'daily') {
      result.push({ ...ev, date: dateStr })
    } else if (ev.recurrence === 'weekly') {
      const evDate = new Date(ev.date + 'T00:00:00')
      if (evDate.getDay() === date.getDay()) {
        result.push({ ...ev, date: dateStr })
      }
    } else if (ev.recurrence === 'monthly') {
      const evDate = new Date(ev.date + 'T00:00:00')
      if (evDate.getDate() === date.getDate()) {
        result.push({ ...ev, date: dateStr })
      }
    } else if (ev.recurrence === 'yearly') {
      const evDate = new Date(ev.date + 'T00:00:00')
      if (evDate.getMonth() === date.getMonth() && evDate.getDate() === date.getDate()) {
        result.push({ ...ev, date: dateStr })
      }
    }
  }
  return result
}
