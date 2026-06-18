import { useState, useEffect, useCallback } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import Sidebar from './components/Sidebar'
import type { Section } from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import PinOverlay from './components/PinOverlay'
import LoginScreen from './components/LoginScreen'
import Dashboard from './sections/Dashboard'
import Calendar from './sections/Calendar'
import Todos from './sections/Todos'
import Documents from './sections/Documents'
import Pomodoro from './sections/Pomodoro'
import QuickLinks from './sections/QuickLinks'
import Settings from './sections/Settings'
import { useAppName } from './hooks/useAppName'
import { useAppIcon } from './hooks/useAppIcon'
import { useBackup } from './hooks/useBackup'
import { useAuth } from './hooks/useAuth'

function App() {
  const [section, setSection] = useState<Section>(() => {
    const hash = window.location.hash.replace('#', '')
    const valid: Section[] = ['dashboard', 'calendar', 'todos', 'pomodoro', 'documents', 'links', 'settings']
    return valid.includes(hash as Section) ? (hash as Section) : 'dashboard'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const { appName, setAppName } = useAppName()
  const { iconPath, pickIcon, resetIcon } = useAppIcon()
  const { users, config, isLoggedIn, loading, enableAuth, login, logout, changePassword, deleteUser, disableAuth } = useAuth()
  useBackup()

  const pin = localStorage.getItem('app_pin') || ''
  const [pinUnlocked, setPinUnlocked] = useState(!pin || config.enabled)

  useEffect(() => {
    if (config.enabled) setPinUnlocked(true)
  }, [config.enabled])

  // Sync pinUnlocked when auth logs in
  useEffect(() => {
    if (config.enabled && isLoggedIn) setPinUnlocked(true)
  }, [config.enabled, isLoggedIn])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }, [])

  useEffect(() => {
    try {
      getCurrentWebviewWindow().setTitle(appName)
    } catch {
      // not in Tauri
    }
  }, [appName])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && (e.key === ',' || e.key === 's')) {
        e.preventDefault()
        setSection('settings')
      } else if (meta && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        setSection('calendar')
      } else if (meta && !e.shiftKey && e.key === 'n') {
        e.preventDefault()
        setSection('todos')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (config.enabled && !isLoggedIn && !loading) {
    return (
      <LoginScreen
        users={users}
        onLogin={() => {}}
        onRegister={async (username, password) => enableAuth(username, password)}
        onSignIn={async (username, password) => login(username, password)}
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <Sidebar section={section} onNavigate={setSection} appName={appName} iconPath={iconPath} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <main className="flex-1 overflow-hidden">
        {section === 'dashboard' && <Dashboard onNavigate={setSection} />}
        {section === 'calendar' && <Calendar />}
        {section === 'todos' && <Todos />}
        {section === 'documents' && <Documents />}
        {section === 'pomodoro' && <Pomodoro />}
        {section === 'links' && <QuickLinks />}
        {section === 'settings' && (
          <Settings
            appName={appName}
            setAppName={setAppName}
            iconPath={iconPath}
            pickIcon={pickIcon}
            resetIcon={resetIcon}
            authUsers={users}
            authConfig={config}
            isLoggedIn={isLoggedIn}
            currentUser={config.currentUser || ''}
            onLogout={logout}
            onChangePassword={changePassword}
            onDeleteUser={deleteUser}
            onDisableAuth={disableAuth}
            onEnableAuth={enableAuth}
          />
        )}
      </main>
      <CommandPalette onNavigate={setSection} />
      {!pinUnlocked && !config.enabled && <PinOverlay pin={pin} onSuccess={() => setPinUnlocked(true)} />}
    </div>
  )
}

export default App
