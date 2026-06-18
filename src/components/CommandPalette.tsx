import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { readJson } from '../lib/storage'
import { readDir } from '@tauri-apps/plugin-fs'
import type { CalendarEvent, TodoItem, QuickLink } from '../types'
import type { Section } from './Sidebar'

interface Props {
  onNavigate: (s: Section) => void
}

interface SearchResult {
  id: string
  title: string
  subtitle: string
  section: Section
  icon: React.ReactNode
}

const SECTION_LABELS: Record<Section, string> = {
  dashboard: 'Dashboard',
  calendar: 'Calendar',
  todos: 'Todos',
  documents: 'Documents',
  links: 'Quick Links',
  settings: 'Settings',
}

const ICONS: Record<string, React.ReactNode> = {
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  todos: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  documents: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  links: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  dashboard: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
}

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

export default function CommandPalette({ onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const [fetchedEvents, setFetchedEvents] = useState<CalendarEvent[]>([])
  const [fetchedTodos, setFetchedTodos] = useState<TodoItem[]>([])
  const [fetchedLinks, setFetchedLinks] = useState<QuickLink[]>([])
  const [docNames, setDocNames] = useState<string[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Fetch data when opening
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIndex(0)
    setDataLoaded(false)

    const fetchAll = async () => {
      const [events, todos, links] = await Promise.all([
        readJson<CalendarEvent[]>('events.json'),
        readJson<TodoItem[]>('todos.json'),
        readJson<QuickLink[]>('links.json'),
      ])
      setFetchedEvents(events || [])
      setFetchedTodos(todos || [])
      setFetchedLinks(links || [])

      const root = localStorage.getItem('documents_root')
      if (root) {
        try {
          const dir = await readDir(root)
          setDocNames(dir.filter(e => e.name && !e.name.startsWith('.')).map(e => e.name!))
        } catch {
          setDocNames([])
        }
      } else {
        setDocNames([])
      }
      setDataLoaded(true)
    }
    fetchAll()
  }, [open])

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      // Show recent items as suggestions
      const out: SearchResult[] = fetchedTodos
        .filter(t => !t.completed)
        .slice(0, 3)
        .map(t => ({
          id: `todo-${t.id}`,
          title: t.title,
          subtitle: `${SECTION_LABELS.todos}${t.course ? ` · ${t.course}` : ''}`,
          section: 'todos' as Section,
          icon: ICONS.todos,
        }))
      out.push(...fetchedEvents.slice(0, 3).map(ev => ({
        id: `event-${ev.id}`,
        title: ev.title,
        subtitle: `${SECTION_LABELS.calendar} · ${ev.date} ${ev.startTime}`,
        section: 'calendar' as Section,
        icon: ICONS.calendar,
      })))
      return out
    }

    const out: SearchResult[] = []

    for (const ev of fetchedEvents) {
      if (matches(ev.title, query)) {
        out.push({
          id: `event-${ev.id}`,
          title: ev.title,
          subtitle: `${SECTION_LABELS.calendar} · ${ev.date} ${ev.startTime}`,
          section: 'calendar',
          icon: ICONS.calendar,
        })
      }
    }

    for (const t of fetchedTodos) {
      if (matches(t.title, query) || matches(t.course, query)) {
        out.push({
          id: `todo-${t.id}`,
          title: t.title,
          subtitle: `${SECTION_LABELS.todos}${t.course ? ` · ${t.course}` : ''}${t.completed ? ' ✓' : ''}`,
          section: 'todos',
          icon: ICONS.todos,
        })
      }
    }

    for (const l of fetchedLinks) {
      if (matches(l.title, query) || matches(l.url, query)) {
        out.push({
          id: `link-${l.id}`,
          title: l.title,
          subtitle: `${SECTION_LABELS.links} · ${l.url}`,
          section: 'links',
          icon: ICONS.links,
        })
      }
    }

    for (const name of docNames) {
      if (matches(name, query)) {
        out.push({
          id: `doc-${name}`,
          title: name,
          subtitle: SECTION_LABELS.documents,
          section: 'documents',
          icon: ICONS.documents,
        })
      }
    }

    return out
  }, [query, fetchedEvents, fetchedTodos, fetchedLinks, docNames])

  const handleSelect = useCallback(
    (index: number) => {
      const r = results[index]
      if (r) {
        onNavigate(r.section)
        setOpen(false)
      }
    },
    [results, onNavigate],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelect(selectedIndex)
      }
    },
    [results.length, selectedIndex, handleSelect],
  )

  // Scroll into view
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden animate-[fadeSlideIn_0.12s_ease]"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search events, todos, documents…"
            className="flex-1 py-3 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text)' }}
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text-secondary)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        {dataLoaded && results.length > 0 && (
          <div ref={listRef} className="max-h-80 overflow-auto py-1">
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => handleSelect(i)}
                onMouseEnter={() => setSelectedIndex(i)}
                className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors"
                style={{
                  background: i === selectedIndex ? 'var(--color-surface-alt)' : 'transparent',
                  color: 'var(--color-text)',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {r.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {r.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {dataLoaded && query.trim() && results.length === 0 && (
          <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
            No results for "{query}"
          </div>
        )}

        {!dataLoaded && (
          <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
            Loading…
          </div>
        )}

        {/* Footer hint */}
        <div
          className="px-4 py-2 border-t text-xs flex items-center gap-3"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span className="flex-1" />
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  )
}
