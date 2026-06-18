import { useMemo, useState, useEffect } from 'react'
import { open as openShell } from '@tauri-apps/plugin-shell'
import { useEvents } from '../hooks/useEvents'
import { useTodos } from '../hooks/useTodos'
import { useLinks } from '../hooks/useLinks'
import { useStats } from '../hooks/useStats'
import { useNotifications } from '../hooks/useNotifications'
import { getEventsForDate } from '../lib/calendar'
import type { Section } from '../components/Sidebar'

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function daysUntil(dateStr: string): number {
  const now = new Date()
  const then = new Date(dateStr + 'T23:59:59')
  return Math.ceil((then.getTime() - now.getTime()) / 86400000)
}

function countdownColor(days: number): string {
  if (days < 0) return '#ef4444'
  if (days === 0) return '#f97316'
  if (days <= 7) return '#f97316'
  if (days <= 14) return '#eab308'
  if (days <= 30) return '#22c55e'
  return '#6b7280'
}

function countdownLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 17) return 'Guten Nachmittag'
  return 'Guten Abend'
}

interface Props {
  onNavigate: (s: Section) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
}

export default function Dashboard({ onNavigate }: Props) {
  const { events } = useEvents()
  const { todos } = useTodos()
  const { links } = useLinks()
  const { todosCompletedToday, pomodoroSessionsToday, focusMinutesToday } = useStats()
  useNotifications()

  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dashboardWidgets = useMemo(() => {
    try {
      const stored = localStorage.getItem('dashboard_widgets')
      return stored ? JSON.parse(stored) : { events: true, countdown: true, links: true, stats: true }
    } catch { return { events: true, countdown: true, links: true, stats: true } }
  }, [])

  const todayEvents = useMemo(
    () => getEventsForDate(events, now).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, now],
  )

  const deadlines = useMemo(
    () =>
      [...todos]
        .filter(t => !t.completed && t.dueDate)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
    [todos],
  )

  const activeTodos = useMemo(() => todos.filter(t => !t.completed).length, [todos])

  return (
    <div className="h-full overflow-auto animate-[fadeIn_0.2s_ease]">
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Greeting + Clock */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {greeting()}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {DAY_NAMES[now.getDay()]}, {now.getDate()}. {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </p>
          <p className="text-3xl font-bold tabular-nums mt-1" style={{ color: 'var(--color-text)' }}>
            {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}:{String(now.getSeconds()).padStart(2, '0')}
          </p>
        </div>

        {/* Stats tiles */}
        {dashboardWidgets.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Open Todos', value: activeTodos, color: 'var(--color-accent)' },
            { label: 'Done Today', value: todosCompletedToday, color: '#22c55e' },
            { label: 'Pomodoros', value: pomodoroSessionsToday, color: '#8b5cf6' },
            { label: 'Focus Today', value: `${focusMinutesToday}m`, color: '#f97316' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl border p-4 flex flex-col items-center gap-1"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <span className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
        )}

        {/* Today's Events */}
        {dashboardWidgets.events && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Today
            </h2>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-accent)' }}
            >
              View Calendar →
            </button>
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {todayEvents.length === 0 ? (
              <div className="px-4 py-5 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                No events today
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {todayEvents.map(ev => (
                  <div
                    key={ev.id + ev.date}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ background: ev.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {ev.title}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {ev.startTime}–{ev.endTime}
                        {ev.recurrence !== 'none' && <span className="ml-1">↻</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        )}

        {/* Countdown */}
        {dashboardWidgets.countdown && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Todos Countdown
            </h2>
            <button
              onClick={() => onNavigate('todos')}
              className="text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-accent)' }}
            >
              View Todos →
            </button>
          </div>
          <div
            className="rounded-xl border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {deadlines.length === 0 ? (
              <div className="px-4 py-5 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                No upcoming deadlines
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {deadlines.slice(0, 6).map(t => {
                  const days = daysUntil(t.dueDate!)
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        className="shrink-0 w-1.5 h-1.5 rounded-full"
                        style={{ background: PRIORITY_COLORS[t.priority] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {t.title}
                        </div>
                        {t.course && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: 'var(--color-surface-alt)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            {t.course}
                          </span>
                        )}
                      </div>
                      <div
                        className="shrink-0 text-xs font-semibold tabular-nums"
                        style={{ color: countdownColor(days) }}
                      >
                        {countdownLabel(days)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
        )}

        {/* Quick Links */}
        {dashboardWidgets.links && links.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Quick Links
              </h2>
              <button
                onClick={() => onNavigate('links')}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-accent)' }}
              >
                View All →
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {links.map(link => (
                <button
                  key={link.id}
                  onClick={() => openShell(link.url)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  <span>{link.emoji}</span>
                  <span>{link.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
