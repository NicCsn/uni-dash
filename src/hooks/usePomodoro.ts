import { useState, useEffect, useCallback, useRef } from 'react'
import type { PomodoroConfig } from '../types'

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'
export type PomodoroStatus = 'idle' | 'running' | 'paused'

const CONFIG_KEY = 'pomodoro_config'

const DEFAULT_CONFIG: PomodoroConfig = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  breakReminder: false,
}

function loadConfig(): PomodoroConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG
}

function saveConfig(config: PomodoroConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.3
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // audio not available
  }
}

export function usePomodoro(onFocusComplete?: () => void) {
  const [config, setConfigState] = useState<PomodoroConfig>(loadConfig())
  const [mode, setMode] = useState<PomodoroMode>('focus')
  const [status, setStatus] = useState<PomodoroStatus>('idle')
  const [remaining, setRemaining] = useState(0)
  const [completedSessions, setCompletedSessions] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const startRef = useRef<() => void>(() => {})
  const modeRef = useRef(mode)
  modeRef.current = mode
  const statusRef = useRef(status)
  statusRef.current = status
  const configRef = useRef(config)
  configRef.current = config
  const onCompleteRef = useRef(onFocusComplete)
  onCompleteRef.current = onFocusComplete

  const getDuration = useCallback((m: PomodoroMode) => {
    switch (m) {
      case 'focus': return config.focusDuration * 60
      case 'shortBreak': return config.shortBreakDuration * 60
      case 'longBreak': return config.longBreakDuration * 60
    }
  }, [config])

  const notify = useCallback(() => {
    playBeep()
    document.title = '⏰ Time\'s up!'
    const appName = localStorage.getItem('app_name') || 'Uni Dash'
    setTimeout(() => { document.title = appName }, 5000)
  }, [])

  useEffect(() => {
    setRemaining(getDuration(mode))
  }, [mode, getDuration])

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
    }
  }, [])

  const tick = useCallback(() => {
    setRemaining(prev => {
      if (prev <= 1) {
        clearInterval(intervalRef.current)
        setStatus('idle')
        notify()
        if (modeRef.current === 'focus') {
          setCompletedSessions(s => {
            const next = s + 1
            onCompleteRef.current?.()
            const cfg = configRef.current
            if ((next) % cfg.sessionsBeforeLongBreak === 0) {
              setMode('longBreak')
            } else {
              setMode('shortBreak')
            }
            if (cfg.autoStartBreaks) {
              setTimeout(() => startRef.current(), 100)
            }
            return next
          })
        } else {
          if (configRef.current.autoStartFocus) {
            setTimeout(() => { setMode('focus'); start() }, 100)
          } else {
            setMode('focus')
          }
        }
        return 0
      }
      return prev - 1
    })
  }, [notify])

  const start = useCallback(() => {
    if (remaining <= 0) {
      setRemaining(getDuration(mode))
    }
    setStatus('running')
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
  }, [remaining, getDuration, mode, tick])
  startRef.current = start

  const pause = useCallback(() => {
    clearInterval(intervalRef.current)
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    setStatus('running')
    intervalRef.current = setInterval(tick, 1000)
  }, [tick])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    setStatus('idle')
    setRemaining(getDuration(mode))
  }, [getDuration, mode])

  const skip = useCallback(() => {
    clearInterval(intervalRef.current)
    setStatus('idle')
    if (mode === 'focus') {
      setCompletedSessions(s => {
        const next = s + 1
        onCompleteRef.current?.()
        if ((next) % config.sessionsBeforeLongBreak === 0) {
          setMode('longBreak')
        } else {
          setMode('shortBreak')
        }
        return next
      })
    } else {
      setMode('focus')
    }
  }, [mode, config.sessionsBeforeLongBreak])

  const setConfig = useCallback((c: PomodoroConfig) => {
    saveConfig(c)
    setConfigState(c)
    if (status === 'idle') {
      setRemaining(getDuration(mode))
    }
  }, [getDuration, mode, status])

  const switchMode = useCallback((m: PomodoroMode) => {
    if (status === 'running') {
      clearInterval(intervalRef.current)
      setStatus('idle')
    }
    setMode(m)
    setRemaining(getDuration(m))
  }, [getDuration, status])

  return {
    config, setConfig,
    mode, switchMode,
    status, start, pause, resume, reset, skip,
    remaining,
    completedSessions,
  }
}
