import { useMemo } from 'react'
import { open as openShell } from '@tauri-apps/plugin-shell'
import { useEvents } from '../hooks/useEvents'
import { useTodos } from '../hooks/useTodos'
import { useLinks } from '../hooks/useLinks'
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

  const today = useMemo(() => new Date(), [])
  const todayEvents = useMemo(
    () => getEventsForDate(events, today).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, today],
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
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {greeting()}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {DAY_NAMES[today.getDay()]}, {today.getDate()}. {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}
          </p>
        </div>

        {/* Today's Events */}
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

        {/* Countdown */}
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

        {/* Quick Links */}
        {links.length > 0 && (
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

        {/* Summary */}
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {activeTodos} open todos · {todayEvents.length} events today · {links.length} quick links
        </div>
      </div>
    </div>
  )
}
