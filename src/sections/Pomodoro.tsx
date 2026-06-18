import { useState, useEffect, useRef } from 'react'
import { usePomodoro } from '../hooks/usePomodoro'
import type { PomodoroMode } from '../hooks/usePomodoro'
import { useStats } from '../hooks/useStats'
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'

const MODE_LABELS: Record<PomodoroMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
}

const MODE_ICONS: Record<PomodoroMode, string> = {
  focus: '🎯',
  shortBreak: '☕',
  longBreak: '🛌',
}

const MODE_COLORS: Record<PomodoroMode, string> = {
  focus: '#ef4444',
  shortBreak: '#22c55e',
  longBreak: '#3b82f6',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Pomodoro() {
  const { logPomodoroSession } = useStats()
  const {
    config, setConfig,
    mode, switchMode,
    status, start, pause, resume, reset, skip,
    remaining,
    completedSessions,
  } = usePomodoro(() => {
    if (mode === 'focus') logPomodoroSession(config.focusDuration)
  })
  const [settingsOpen, setSettingsOpen] = useState(false)

  const total = (() => {
    switch (mode) {
      case 'focus': return config.focusDuration * 60
      case 'shortBreak': return config.shortBreakDuration * 60
      case 'longBreak': return config.longBreakDuration * 60
    }
  })()

  const progress = total > 0 ? (total - remaining) / total : 0
  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference * (1 - progress)
  const accentColor = MODE_COLORS[mode]
  const sessionDotCount = config.sessionsBeforeLongBreak
  const dotsFilled = completedSessions % sessionDotCount

  // Break reminder
  const reminderRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (status === 'idle' && (mode === 'shortBreak' || mode === 'longBreak') && config.breakReminder) {
      reminderRef.current = setTimeout(async () => {
        try {
          let granted = await isPermissionGranted()
          if (!granted) { const p = await requestPermission(); granted = p === 'granted' }
          if (granted) sendNotification({ title: 'Break Over', body: 'Time to get back to focus!' })
        } catch {}
      }, 60000)
    } else {
      clearTimeout(reminderRef.current)
    }
    return () => clearTimeout(reminderRef.current)
  }, [status, mode, config.breakReminder])

  return (
    <div className="h-full flex flex-col">
      {/* Colored header strip */}
      <div
        className="shrink-0"
        style={{ height: 3, background: accentColor, opacity: 0.3 }}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-sm mx-auto px-6 py-8 flex flex-col items-center gap-6">

          {/* Mode tabs */}
          <div className="flex gap-2 w-full">
            {(Object.keys(MODE_LABELS) as PomodoroMode[]).map(key => (
              <button
                key={key}
                onClick={() => switchMode(key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                style={{
                  background: mode === key ? accentColor : 'var(--color-surface-alt)',
                  color: mode === key ? '#fff' : 'var(--color-text-secondary)',
                  boxShadow: mode === key ? `0 0 12px ${accentColor}44` : 'none',
                }}
              >
                <span>{MODE_ICONS[key]}</span>
                <span className="hidden sm:inline">{MODE_LABELS[key]}</span>
              </button>
            ))}
          </div>

          {/* Timer card */}
          <div
            className="w-full rounded-2xl border p-8 flex flex-col items-center gap-6"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            {/* Ring */}
            <div className="relative w-56 h-56">
              <svg width="224" height="224" viewBox="0 0 224 224" className="absolute -top-1 -left-1">
                <circle cx="112" cy="112" r="90" fill="none" stroke="var(--color-border)" strokeWidth="10" />
                <circle
                  cx="112" cy="112" r="90"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 112 112)"
                  style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
              </svg>
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span
                  className="text-5xl font-bold tabular-nums"
                  style={{
                    color: 'var(--color-text)',
                    animation: status === 'running' ? 'pulse 2s ease-in-out infinite' : 'none',
                  }}
                >
                  {formatTime(remaining)}
                </span>
                <span className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {MODE_LABELS[mode]}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {status === 'idle' && (
                <button
                  onClick={start}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: accentColor,
                    color: '#fff',
                    boxShadow: `0 0 20px ${accentColor}44`,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}
              {status === 'running' && (
                <button
                  onClick={pause}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: accentColor,
                    color: '#fff',
                    boxShadow: `0 0 20px ${accentColor}44`,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                </button>
              )}
              {status === 'paused' && (
                <>
                  <button
                    onClick={resume}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: accentColor,
                      color: '#fff',
                      boxShadow: `0 0 20px ${accentColor}44`,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={reset}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 119 9" />
                      <path d="M3 12h4" />
                      <path d="M3 12V8" />
                    </svg>
                  </button>
                </>
              )}
              {(status === 'running' || status === 'paused') && (
                <button
                  onClick={skip}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Session dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: sessionDotCount }, (_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i < dotsFilled ? 8 : 6,
                    height: i < dotsFilled ? 8 : 6,
                    background: i < dotsFilled ? accentColor : 'var(--color-border)',
                  }}
                />
              ))}
              <span className="text-xs ml-2" style={{ color: 'var(--color-text-secondary)' }}>
                {completedSessions} sessions
              </span>
            </div>
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setSettingsOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transition: 'transform 0.2s', transform: settingsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Settings
          </button>

          {/* Open in separate window */}
          <button
            onClick={async () => {
              try {
                const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
                try { WebviewWindow.getByLabel('pomodoro'); return } catch { /* doesn't exist */ }
                new WebviewWindow('pomodoro', {
                  url: window.location.href.split('#')[0] + '#pomodoro',
                  width: 420,
                  height: 580,
                  title: 'Pomodoro',
                })
              } catch {
                // not in Tauri
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            Open in separate window
          </button>

          {/* Collapsible config */}
          {settingsOpen && (
            <div
              className="w-full rounded-xl border p-4 flex flex-col gap-3 animate-[fadeSlideIn_0.12s_ease]"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Focus duration (min)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={config.focusDuration}
                  onChange={e => setConfig({ ...config, focusDuration: Math.max(1, Math.min(120, parseInt(e.target.value) || 1)) })}
                  className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none border"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Short break (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.shortBreakDuration}
                  onChange={e => setConfig({ ...config, shortBreakDuration: Math.max(1, Math.min(60, parseInt(e.target.value) || 1)) })}
                  className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none border"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Long break (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.longBreakDuration}
                  onChange={e => setConfig({ ...config, longBreakDuration: Math.max(1, Math.min(60, parseInt(e.target.value) || 1)) })}
                  className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none border"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Sessions before long break</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.sessionsBeforeLongBreak}
                  onChange={e => setConfig({ ...config, sessionsBeforeLongBreak: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                  className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none border"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Auto-start breaks</span>
                <button
                  onClick={() => setConfig({ ...config, autoStartBreaks: !config.autoStartBreaks })}
                  className="relative w-10 h-6 rounded-full transition-all duration-300"
                  style={{ background: config.autoStartBreaks ? accentColor : '#e5e7eb' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                    style={{ transform: config.autoStartBreaks ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Auto-start focus</span>
                <button
                  onClick={() => setConfig({ ...config, autoStartFocus: !config.autoStartFocus })}
                  className="relative w-10 h-6 rounded-full transition-all duration-300"
                  style={{ background: config.autoStartFocus ? accentColor : '#e5e7eb' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                    style={{ transform: config.autoStartFocus ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Break reminder</span>
                <button
                  onClick={() => setConfig({ ...config, breakReminder: !config.breakReminder })}
                  className="relative w-10 h-6 rounded-full transition-all duration-300"
                  style={{ background: config.breakReminder ? accentColor : '#e5e7eb' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                    style={{ transform: config.breakReminder ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
