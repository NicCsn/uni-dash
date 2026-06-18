import { useState, useEffect, useCallback, useRef } from 'react'

export type Theme = 'light' | 'dark'

export interface ScheduleConfig {
  enabled: boolean
  lightStart: string
  lightEnd: string
}

const SCHEDULE_KEY = 'theme_schedule'

function loadSchedule(): ScheduleConfig {
  try {
    const stored = localStorage.getItem(SCHEDULE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { enabled: false, lightStart: '06:00', lightEnd: '18:00' }
}

function saveSchedule(s: ScheduleConfig) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s))
}

function shouldBeDark(schedule: ScheduleConfig): boolean {
  if (!schedule.enabled) return false
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = schedule.lightStart.split(':').map(Number)
  const [eh, em] = schedule.lightEnd.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (startMin < endMin) {
    return minutes < startMin || minutes >= endMin
  }
  return minutes < startMin && minutes >= endMin
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [schedule, setScheduleState] = useState<ScheduleConfig>(loadSchedule)
  const scheduleRef = useRef(schedule)
  scheduleRef.current = schedule

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!schedule.enabled) return
    const check = () => {
      const dark = shouldBeDark(scheduleRef.current)
      setTheme(dark ? 'dark' : 'light')
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [schedule.enabled, schedule.lightStart, schedule.lightEnd])

  const toggle = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const setSchedule = useCallback((s: ScheduleConfig) => {
    saveSchedule(s)
    setScheduleState(s)
  }, [])

  return { theme, toggle, schedule, setSchedule }
}
