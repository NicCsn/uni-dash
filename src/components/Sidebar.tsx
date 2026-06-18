import React from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'

export type Section = 'dashboard' | 'calendar' | 'todos' | 'pomodoro' | 'documents' | 'links' | 'settings'

interface Props {
  section: Section
  onNavigate: (s: Section) => void
  appName: string
  iconPath: string | null
  collapsed: boolean
  onToggleCollapse: () => void
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
    id: 'pomodoro',
    label: 'Pomodoro',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M9 2h6" />
        <path d="M12 2v2" />
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

export default function Sidebar({ section, onNavigate, appName, iconPath, collapsed, onToggleCollapse }: Props) {
  return (
    <aside
      className={`flex flex-col border-r shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className={`flex items-center py-5 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
        {collapsed ? (
          <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {appName.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3)}
          </span>
        ) : (
          <>
            {iconPath && (
              <img src={convertFileSrc(iconPath)} className="w-6 h-6 rounded" alt="" />
            )}
            <h1 className="text-lg font-bold tracking-tight truncate" style={{ color: 'var(--color-text)' }}>
              {appName}
            </h1>
          </>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map(item => {
          const active = section === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:scale-[1.02] hover:bg-(--color-surface-alt) ${collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'}`}
              style={{
                background: active ? 'var(--color-surface-alt)' : 'transparent',
                color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
              }}
            >
              {item.icon}
              {!collapsed && item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 px-2 pt-2 pb-2">
            <button
              onClick={() => onNavigate('settings')}
              className="flex justify-center w-full px-0 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:scale-[1.02] hover:bg-(--color-surface-alt)"
              style={{
                background: section === 'settings' ? 'var(--color-surface-alt)' : 'transparent',
                color: section === 'settings' ? 'var(--color-text)' : 'var(--color-text-secondary)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
            <button
              onClick={onToggleCollapse}
              className="flex justify-center w-full px-0 py-2 text-sm transition-all duration-150 hover:opacity-70 active:scale-95 hover:scale-[1.02] hover:bg-(--color-surface-alt) rounded-lg"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 pt-2 pb-2">
            <button
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:scale-[1.02] hover:bg-(--color-surface-alt)"
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
            <button
              onClick={onToggleCollapse}
              className="flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:opacity-70 active:scale-95 hover:scale-[1.02] hover:bg-(--color-surface-alt)"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
