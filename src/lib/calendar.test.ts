import { describe, it, expect } from 'vitest'
import { formatDate, getEventsForDate } from './calendar'
import type { CalendarEvent } from '../types'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: 'Test Event',
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '10:00',
    color: '#3b82f6',
    recurrence: 'none' as const,
    ...overrides,
  }
}

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 0, 15)
    expect(formatDate(d)).toBe('2026-01-15')
  })

  it('pads single-digit month and day', () => {
    const d = new Date(2026, 3, 5)
    expect(formatDate(d)).toBe('2026-04-05')
  })
})

describe('getEventsForDate', () => {
  it('returns non-recurring event on its date', () => {
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'none' })
    const results = getEventsForDate([ev], new Date(2026, 0, 15))
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(ev.id)
  })

  it('does not return non-recurring event on other date', () => {
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'none' })
    const results = getEventsForDate([ev], new Date(2026, 0, 16))
    expect(results.length).toBe(0)
  })

  it('returns daily event on any date', () => {
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'daily' })
    const results = getEventsForDate([ev], new Date(2026, 5, 10))
    expect(results.length).toBe(1)
  })

  it('returns weekly event on same day of week', () => {
    // Jan 15, 2026 is a Thursday
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'weekly' })
    // Jan 22, 2026 is also a Thursday
    const results = getEventsForDate([ev], new Date(2026, 0, 22))
    expect(results.length).toBe(1)
  })

  it('does not return weekly event on different day', () => {
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'weekly' }) // Thursday
    const results = getEventsForDate([ev], new Date(2026, 0, 16)) // Friday
    expect(results.length).toBe(0)
  })

  it('returns monthly event on same day of month', () => {
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'monthly' })
    const results = getEventsForDate([ev], new Date(2026, 2, 15))
    expect(results.length).toBe(1)
  })

  it('returns yearly event on same month and day', () => {
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'yearly' })
    const results = getEventsForDate([ev], new Date(2027, 0, 15))
    expect(results.length).toBe(1)
  })

  it('does not return yearly event on wrong month', () => {
    const ev = makeEvent({ date: '2026-01-15', recurrence: 'yearly' })
    const results = getEventsForDate([ev], new Date(2027, 1, 15))
    expect(results.length).toBe(0)
  })
})
