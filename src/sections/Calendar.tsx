import { useState, useMemo, useRef, useEffect } from 'react'
import type { CalendarEvent, Recurrence } from '../types'
import { useEvents } from '../hooks/useEvents'
import Modal from '../components/Modal'

const HOUR_HEIGHT = 60
const PX_PER_MINUTE = (HOUR_HEIGHT + 1) / 60
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#f97316']
const RECURRENCE_LABELS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

function getWeekDates(ref: Date): Date[] {
  const d = new Date(ref)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d)
    date.setDate(d.getDate() + i)
    return date
  })
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmt(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h * 60 + m) * PX_PER_MINUTE
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return formatDate(d)
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setFullYear(d.getFullYear() + years)
  return formatDate(d)
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = new Date(first)
  const dayOfWeek = start.getDay()
  start.setDate(start.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))
  const end = new Date(last)
  const endDay = end.getDay()
  end.setDate(end.getDate() + (endDay === 0 ? 0 : 7 - endDay))
  const days: Date[] = []
  let d = new Date(start)
  while (d <= end) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function expandRecurring(events: CalendarEvent[], weekStart: string, weekEnd: string): CalendarEvent[] {
  const result: CalendarEvent[] = []
  for (const ev of events) {
    if (ev.recurrence === 'none') {
      result.push(ev)
      continue
    }
    const maxIter = 500
    let current = ev.date
    let iterations = 0
    while (current <= weekEnd && iterations < maxIter) {
      iterations++
      if (current >= weekStart) {
        result.push({ ...ev, date: current })
      }
      switch (ev.recurrence) {
        case 'daily':
          current = addDays(current, 1)
          break
        case 'weekly':
          current = addDays(current, 7)
          break
        case 'monthly':
          current = addMonths(current, 1)
          break
        case 'yearly':
          current = addYears(current, 1)
          break
      }
    }
  }
  return result
}

interface FormData {
  title: string
  date: string
  startTime: string
  endTime: string
  color: string
  recurrence: Recurrence
}

const emptyForm: FormData = {
  title: '',
  date: formatDate(new Date()),
  startTime: '09:00',
  endTime: '10:00',
  color: COLORS[0],
  recurrence: 'none',
}

export default function Calendar() {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const dragIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: nowMinutes * PX_PER_MINUTE - 300, behavior: 'smooth' })
  }, [])

  const weekDates = useMemo(() => {
    const ref = new Date()
    ref.setDate(ref.getDate() + weekOffset * 7)
    return getWeekDates(ref)
  }, [weekOffset])

  const weekStart = formatDate(weekDates[0])
  const weekEnd = formatDate(weekDates[6])

  const weekEvents = useMemo(
    () => expandRecurring(events, weekStart, weekEnd),
    [events, weekStart, weekEnd],
  )

  const monthDays = useMemo(() => getMonthDays(monthDate.getFullYear(), monthDate.getMonth()), [monthDate])
  const monthEventMap = useMemo(() => {
    const ms = formatDate(monthDays[0])
    const me = formatDate(monthDays[monthDays.length - 1])
    const expanded = expandRecurring(events, ms, me)
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of expanded) {
      const arr = map.get(ev.date) || []
      arr.push(ev)
      map.set(ev.date, arr)
    }
    return map
  }, [events, monthDays])

  function openAdd(date?: string) {
    setEditingId(null)
    setForm({ ...emptyForm, date: date || formatDate(new Date()) })
    setModalOpen(true)
  }

  function openEdit(ev: CalendarEvent) {
    setEditingId(ev.id)
    setForm({
      title: ev.title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      color: ev.color,
      recurrence: ev.recurrence,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    if (editingId) {
      await updateEvent({ id: editingId, ...form })
    } else {
      await addEvent({ id: crypto.randomUUID(), ...form })
    }
    setModalOpen(false)
  }

  async function handleDelete() {
    if (editingId) {
      await deleteEvent(editingId)
      setModalOpen(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (viewMode === 'week') setWeekOffset(o => o - 1)
              else setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1))
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-(--color-surface-alt)"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            {viewMode === 'week'
              ? `${fmt(weekDates[0])} – ${fmt(weekDates[6])}`
              : monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }
          </h2>
          <button
            onClick={() => {
              if (viewMode === 'week') setWeekOffset(o => o + 1)
              else setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1))
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-(--color-surface-alt)"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <div
            className="ml-2 flex rounded-lg overflow-hidden border text-xs font-medium"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => setViewMode('week')}
              className="px-2.5 py-1 transition-colors"
              style={{
                background: viewMode === 'week' ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                color: viewMode === 'week' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className="px-2.5 py-1 transition-colors"
              style={{
                background: viewMode === 'month' ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                color: viewMode === 'month' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              Month
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAdd()}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            + Event
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {viewMode === 'week' ? (
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="flex relative" style={{ minHeight: 24 * HOUR_HEIGHT }}>
            {/* Time gutter */}
            <div className="w-16 shrink-0 relative">
              {/* Spacer to match day header height */}
              <div
                className="sticky top-0 z-10 invisible text-xs font-medium py-2"
                style={{
                  background: 'var(--color-bg)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                Mon<br />01
              </div>
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex items-center justify-end pr-2 text-xs"
                  style={{
                    height: HOUR_HEIGHT,
                    color: 'var(--color-text-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
              {(() => {
                const todayStr = formatDate(new Date())
                const isTodayShown = weekDates.some(d => formatDate(d) === todayStr)
                if (!isTodayShown) return null
                return (
                  <div className="absolute right-0 pointer-events-none z-30" style={{ top: nowMinutes * PX_PER_MINUTE - 4 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="4" fill="#ef4444" />
                    </svg>
                  </div>
                )
              })()}
            </div>

            {/* Day columns */}
            {weekDates.map((date, di) => {
              const dateStr = formatDate(date)
              const dayEvents = weekEvents.filter(e => e.date === dateStr)
              const isToday = formatDate(new Date()) === dateStr

              return (
                <div
                  key={dateStr}
                  className="flex-1 relative"
                  style={{ borderLeft: '1px solid var(--color-border)' }}
                >
                  {/* Day header */}
                  <div
                    className="sticky top-0 z-10 text-center text-xs font-medium py-2"
                    style={{
                      background: 'var(--color-bg)',
                      borderBottom: '1px solid var(--color-border)',
                      color: isToday ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {DAY_LABELS[di]}
                    <br />
                    {date.getDate()}
                  </div>

                  {/* Hour slots */}
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      className="cursor-pointer transition-colors hover:bg-(--color-surface-alt)"
                      style={{
                        height: HOUR_HEIGHT,
                        borderBottom: '1px solid var(--color-border)',
                      }}
                      onDragOver={e => { e.preventDefault() }}
                      onDrop={e => {
                        e.preventDefault()
                        const id = e.dataTransfer.getData('text/plain')
                        if (!id) return
                        const st = `${String(h).padStart(2, '0')}:00`
                        const eh = h + 1 < 24 ? h + 1 : 23
                        const ev = events.find(x => x.id === id)
                        if (ev) {
                          updateEvent({ ...ev, date: dateStr, startTime: st, endTime: `${String(eh).padStart(2, '0')}:00` })
                        }
                        dragIdRef.current = null
                      }}
                      onClick={() => {
                        const st = `${String(h).padStart(2, '0')}:00`
                        const eh = h + 1 < 24 ? h + 1 : 23
                        openAdd(dateStr)
                        setForm(f => ({ ...f, date: dateStr, startTime: st, endTime: `${String(eh).padStart(2, '0')}:00` }))
                      }}
                    />
                  ))}

                  {/* Event blocks */}
                  {dayEvents.map(ev => {
                    const start = parseTime(ev.startTime)
                    const end = parseTime(ev.endTime)
                    const top = start
                    const height = Math.max(end - start, 30)

                    return (
                      <div
                        key={ev.id + ev.date}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', ev.id)
                          dragIdRef.current = ev.id
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          openEdit(ev)
                        }}
                        className="absolute left-1 right-1 rounded-md px-2 py-1 text-xs cursor-grab active:cursor-grabbing overflow-hidden transition-opacity hover:opacity-80 z-20"
                        style={{
                          top,
                          height,
                          background: ev.color,
                          color: '#fff',
                        }}
                      >
                        <div className="font-medium truncate">{ev.title}</div>
                        <div className="opacity-80">
                          {ev.startTime}–{ev.endTime}
                          {ev.recurrence !== 'none' && (
                            <span className="ml-1">↻</span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                </div>
              )
            })}

            {/* Full-width red current-time line */}
            {(() => {
              const todayStr = formatDate(new Date())
              const isTodayShown = weekDates.some(d => formatDate(d) === todayStr)
              if (!isTodayShown) return null
              return (
                <div
                  className="absolute left-0 pointer-events-none z-30"
                  style={{ top: nowMinutes * PX_PER_MINUTE, left: 64, right: 0, height: '2px', background: '#ef4444' }}
                />
              )
            })()}

          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-7 border-t border-l rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            {/* Day headers */}
            {DAY_LABELS.map(d => (
              <div
                key={d}
                className="text-center text-xs font-medium py-2 border-r border-b"
                style={{
                  background: 'var(--color-surface-alt)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {d}
              </div>
            ))}

            {/* Day cells */}
            {monthDays.map(date => {
              const dateStr = formatDate(date)
              const dayEvents = monthEventMap.get(dateStr) || []
              const isToday = formatDate(new Date()) === dateStr
              const isCurrentMonth = date.getMonth() === monthDate.getMonth()

              return (
                <div
                  key={dateStr}
                  className="min-h-[90px] border-r border-b p-1 transition-colors hover:bg-(--color-surface-alt) cursor-pointer"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: isToday ? 'var(--color-surface-alt)' : 'transparent',
                  }}
                  onClick={() => {
                    setViewMode('week')
                    const base = new Date()
                    const bd = base.getDay()
                    base.setDate(base.getDate() - (bd === 0 ? 6 : bd - 1))
                    const target = new Date(date)
                    const td = target.getDay()
                    target.setDate(target.getDate() - (td === 0 ? 6 : td - 1))
                    const offset = Math.round((target.getTime() - base.getTime()) / 604800000)
                    setWeekOffset(offset)
                  }}
                >
                  <div
                    className="text-xs font-medium mb-1"
                    style={{
                      color: isToday
                        ? 'var(--color-accent)'
                        : isCurrentMonth
                          ? 'var(--color-text)'
                          : 'var(--color-text-secondary)',
                    }}
                  >
                    {date.getDate()}
                  </div>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id + ev.date}
                      onClick={e => {
                        e.stopPropagation()
                        openEdit(ev)
                      }}
                      className="text-[10px] leading-tight truncate rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:opacity-80"
                      style={{ background: ev.color, color: '#fff' }}
                    >
                      {ev.startTime} {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Event' : 'New Event'}
      >
        <div className="flex flex-col gap-3">
          <input
            placeholder="Event title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <div className="flex gap-2">
            <input
              type="time"
              value={form.startTime}
              onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
            <input
              type="time"
              value={form.endTime}
              onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Repeat
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {RECURRENCE_LABELS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setForm(f => ({ ...f, recurrence: r.value }))}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: form.recurrence === r.value ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                    color: form.recurrence === r.value ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-7 h-7 rounded-full transition-transform"
                style={{
                  background: c,
                  transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                  outline: form.color === c ? `2px solid var(--color-text)` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            {editingId && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--color-surface-alt)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              {editingId ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
