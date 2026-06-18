import { useState, useEffect, useCallback } from 'react'
import type { CalendarEvent } from '../types'
import { readJson, writeJson } from '../lib/storage'

const FILE = 'events.json'

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    readJson<CalendarEvent[]>(FILE).then(data => {
      if (data) setEvents(data)
    })
  }, [])

  const persist = useCallback(async (next: CalendarEvent[]) => {
    setEvents(next)
    await writeJson(FILE, next)
  }, [])

  const addEvent = useCallback(
    async (e: CalendarEvent) => {
      await persist([...events, e])
    },
    [events, persist],
  )

  const updateEvent = useCallback(
    async (updated: CalendarEvent) => {
      await persist(events.map(e => (e.id === updated.id ? updated : e)))
    },
    [events, persist],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      await persist(events.filter(e => e.id !== id))
    },
    [events, persist],
  )

  const clearEvents = useCallback(async () => {
    await persist([])
  }, [persist])

  return { events, addEvent, updateEvent, deleteEvent, clearEvents }
}
