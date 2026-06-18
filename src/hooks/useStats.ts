import { useState, useEffect, useCallback } from 'react'
import type { StatsData } from '../types'
import { readJson, writeJson } from '../lib/storage'

const FILE = 'stats.json'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyStats(): StatsData {
  return { todoCompletions: {}, pomodoroSessions: {}, pomodoroFocusMinutes: {} }
}

export function useStats() {
  const [stats, setStats] = useState<StatsData>(emptyStats)

  useEffect(() => {
    readJson<StatsData>(FILE).then(data => {
      if (data) setStats(data)
    })
  }, [])

  const persist = useCallback(async (next: StatsData) => {
    setStats(next)
    await writeJson(FILE, next)
  }, [])

  const logTodoCompleted = useCallback(async () => {
    const key = todayKey()
    const next = { ...stats }
    next.todoCompletions = { ...next.todoCompletions, [key]: (next.todoCompletions[key] ?? 0) + 1 }
    await persist(next)
  }, [stats, persist])

  const logPomodoroSession = useCallback(async (focusMinutes: number) => {
    const key = todayKey()
    const next = { ...stats }
    next.pomodoroSessions = { ...next.pomodoroSessions, [key]: (next.pomodoroSessions[key] ?? 0) + 1 }
    next.pomodoroFocusMinutes = { ...next.pomodoroFocusMinutes, [key]: (next.pomodoroFocusMinutes[key] ?? 0) + focusMinutes }
    await persist(next)
  }, [stats, persist])

  const key = todayKey()

  return {
    stats,
    logTodoCompleted,
    logPomodoroSession,
    todosCompletedToday: stats.todoCompletions[key] ?? 0,
    pomodoroSessionsToday: stats.pomodoroSessions[key] ?? 0,
    focusMinutesToday: stats.pomodoroFocusMinutes[key] ?? 0,
  }
}
