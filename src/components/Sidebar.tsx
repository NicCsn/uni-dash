import React from 'react'

export type Section = 'dashboard' | 'calendar' | 'todos' | 'documents' | 'links' | 'settings'

interface Props {
  section: Section
  onNavigate: (s: Section) => void
}

const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    id: 'todos',
    label: 'Todos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: 'links',
    label: 'Quick Links',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
]

export default function Sidebar({ section, onNavigate }: Props) {
  return (
    <aside
      className="w-56 flex flex-col border-r shrink-0"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Uni Dash
        </h1>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map(item => {
          const active = section === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: active ? 'var(--color-surface-alt)' : 'transparent',
                color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-2 pb-3 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            background: section === 'settings' ? 'var(--color-surface-alt)' : 'transparent',
            color: section === 'settings' ? 'var(--color-text)' : 'var(--color-text-secondary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  )
}
