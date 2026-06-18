import { useEffect, useRef } from 'react'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { readJson } from '../lib/storage'
import { getEventsForDate } from '../lib/calendar'
import type { CalendarEvent, TodoItem, NotificationConfig } from '../types'

const CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

function loadConfig(): NotificationConfig {
  try {
    const stored = localStorage.getItem('notification_config')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { enabled: true, notifyTodos: true, notifyEvents: true }
}

async function tryNotify(title: string, body: string) {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      const permission = await requestPermission()
      granted = permission === 'granted'
    }
    if (granted) {
      sendNotification({ title, body })
    }
  } catch {
    // not in Tauri
  }
}

let notifiedIds = new Set<string>()

export function useNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    const check = async () => {
      try {
        const cfg = loadConfig()
        if (!cfg.enabled) return

        const now = new Date()

        // Check for due todos
        if (cfg.notifyTodos) {
          const todos = await readJson<TodoItem[]>('todos.json')
          if (todos) {
            for (const t of todos) {
              if (t.completed) continue
              if (!t.dueDate) continue
              const key = `todo-${t.id}`
              if (notifiedIds.has(key)) continue
              const due = new Date(t.dueDate + 'T23:59:59')
              if (due.getTime() <= now.getTime() && due.getTime() > now.getTime() - 86400000) {
                notifiedIds.add(key)
                tryNotify('Todo fällig', `${t.title} ist heute fällig${t.course ? ` (${t.course})` : ''}`)
              } else if (due.getTime() < now.getTime() - 86400000 && due.getTime() > now.getTime() - 2 * 86400000) {
                notifiedIds.add(key)
                tryNotify('Todo überfällig', `${t.title} ist seit gestern überfällig${t.course ? ` (${t.course})` : ''}`)
              }
            }
          }
        }

        // Check for upcoming events (within 30 min)
        if (cfg.notifyEvents) {
          const events = await readJson<CalendarEvent[]>('events.json')
          if (events) {
            const todayEvents = getEventsForDate(events, new Date())
            for (const ev of todayEvents) {
              const key = `event-${ev.id}-${ev.date}`
              if (notifiedIds.has(key)) continue
              const [h, m] = ev.startTime.split(':').map(Number)
              const evDate = new Date()
              evDate.setHours(h, m, 0, 0)
              const diff = evDate.getTime() - now.getTime()
              if (diff > 0 && diff <= 30 * 60 * 1000) {
                notifiedIds.add(key)
                tryNotify('Bevorstehender Termin', `${ev.title} beginnt um ${ev.startTime}`)
              }
            }
          }
        }
      } catch {
        // silent
      }
    }

    check()
    intervalRef.current = setInterval(check, CHECK_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [])
}
