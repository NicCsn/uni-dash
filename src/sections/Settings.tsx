import { useState, useEffect, useCallback } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { readJson, writeJson } from '../lib/storage'
import { convertFileSrc } from '@tauri-apps/api/core'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { isTauri } from '@tauri-apps/api/core'
import { enable as enableAutostart, disable as disableAutostart, isEnabled as isAutostartEnabled } from '@tauri-apps/plugin-autostart'
import { useTheme } from '../hooks/useTheme'
import { useAccentColor } from '../hooks/useAccentColor'
import { useEvents } from '../hooks/useEvents'
import type { NotificationConfig, TodoTag, BackupConfig, UserRecord, AuthConfig } from '../types'
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import Modal from '../components/Modal'

interface Props {
  appName: string
  setAppName: (name: string) => void
  iconPath: string | null
  pickIcon: () => Promise<void>
  resetIcon: () => void
  authUsers: UserRecord[]
  authConfig: AuthConfig
  isLoggedIn: boolean
  currentUser: string
  onLogout: () => void
  onChangePassword: (oldPw: string, newPw: string) => Promise<boolean>
  onDeleteUser: (username: string) => Promise<void>
  onDisableAuth: () => Promise<boolean>
  onEnableAuth: (username: string, password: string) => Promise<string | null>
}

export default function Settings({ appName, setAppName, iconPath, pickIcon, resetIcon, authUsers, authConfig, isLoggedIn, currentUser, onLogout, onChangePassword, onDeleteUser, onDisableAuth, onEnableAuth }: Props) {
  const { theme, toggle, schedule, setSchedule } = useTheme()
  const { accentColor, setAccentColor, resetAccentColor, presets } = useAccentColor(theme)
  const { clearEvents } = useEvents()
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'uptodate' | 'available'>('idle')
  const [updateVersion, setUpdateVersion] = useState('')

  useEffect(() => {
    setRootPath(localStorage.getItem('documents_root'))
  }, [])

  const [autostartOn, setAutostartOn] = useState(false)

  const [notifConfig, setNotifConfig] = useState<NotificationConfig>(() => {
    try {
      const stored = localStorage.getItem('notification_config')
      return stored ? JSON.parse(stored) : { enabled: true, notifyTodos: true, notifyEvents: true }
    } catch {
      return { enabled: true, notifyTodos: true, notifyEvents: true }
    }
  })

  const updateNotifConfig = useCallback((updates: Partial<NotificationConfig>) => {
    setNotifConfig(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('notification_config', JSON.stringify(next))
      return next
    })
  }, [])

  // Tags management
  const [tags, setTags] = useState<TodoTag[]>(() => {
    try { return JSON.parse(localStorage.getItem('todo_tags') || '[]') }
    catch { return [] }
  })
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const updateTags = useCallback((next: TodoTag[]) => {
    setTags(next)
    localStorage.setItem('todo_tags', JSON.stringify(next))
  }, [])

  // Link groups
  const [linkGroupsEnabled, setLinkGroupsEnabled] = useState(() => localStorage.getItem('link_groups_enabled') === 'true')

  // Dashboard widgets
  const [dashboardWidgets, setDashboardWidgets] = useState(() => {
    try {
      const stored = localStorage.getItem('dashboard_widgets')
      return stored ? JSON.parse(stored) : { events: true, countdown: true, links: true, stats: true }
    } catch { return { events: true, countdown: true, links: true, stats: true } }
  })

  // PIN
  const [pin, setPin] = useState(() => localStorage.getItem('app_pin') || '')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  // Password change
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')

  // Enable auth modal
  const [enableModalOpen, setEnableModalOpen] = useState(false)
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regError, setRegError] = useState('')
  const [enableBusy, setEnableBusy] = useState(false)

  // Backup
  const [backupConfig, setBackupConfigState] = useState<BackupConfig>(() => {
    try {
      const stored = localStorage.getItem('backup_config')
      return stored ? JSON.parse(stored) : { enabled: false, interval: 'daily' }
    } catch { return { enabled: false, interval: 'daily' } }
  })
  const updateBackupConfig = useCallback((updates: Partial<BackupConfig>) => {
    setBackupConfigState(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('backup_config', JSON.stringify(next))
      return next
    })
  }, [])

useEffect(() => {
  isAutostartEnabled().then(setAutostartOn).catch(() => {})
}, [])

const handleAutostartToggle = useCallback(async () => {
  try {
    if (autostartOn) {
      await disableAutostart()
      setAutostartOn(false)
    } else {
      await enableAutostart()
      setAutostartOn(true)
    }
  } catch {
    // not in Tauri
  }
}, [autostartOn])

const handlePickFolder = useCallback(async () => {
    const dir = await openDialog({
      directory: true,
      multiple: false,
      title: 'Select Documents Folder',
    })
    if (dir) {
      localStorage.setItem('documents_root', dir)
      setRootPath(dir)
    }
  }, [])

  const handleClearFolder = useCallback(() => {
    localStorage.removeItem('documents_root')
    setRootPath(null)
  }, [])

  const handleChangePassword = useCallback(async () => {
    if (!oldPw || !newPw) { setPwError('Fill in all fields'); return }
    if (newPw.length < 4) { setPwError('Password must be at least 4 characters'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    const ok = await onChangePassword(oldPw, newPw)
    if (ok) {
      setPwModalOpen(false)
    } else {
      setPwError('Current password is wrong')
    }
  }, [oldPw, newPw, confirmPw, onChangePassword])

  const handleEnableAuth = useCallback(async () => {
    if (!regUsername.trim()) { setRegError('Enter a username'); return }
    if (regPassword.length < 4) { setRegError('Password must be at least 4 characters'); return }
    if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return }
    if (authUsers.some(u => u.username === regUsername.trim())) { setRegError('Username already taken'); return }
    setEnableBusy(true)
    setRegError('')
    try {
      const err = await onEnableAuth(regUsername.trim(), regPassword)
      if (err === null) setEnableModalOpen(false)
      else setRegError(err)
    } catch (e) {
      setRegError(String(e))
    } finally {
      setEnableBusy(false)
    }
  }, [regUsername, regPassword, regConfirm, authUsers, onEnableAuth])

  async function handleCheckUpdates() {
    if (!isTauri()) return
    if (updateStatus === 'available' && updateVersion) {
      const update = await check()
      if (update) {
        await update.downloadAndInstall()
        await relaunch()
      }
      return
    }
    setUpdateStatus('checking')
    try {
      const update = await check()
      if (update) {
        setUpdateVersion(update.version)
        setUpdateStatus('available')
      } else {
        setUpdateStatus('uptodate')
      }
    } catch {
      setUpdateStatus('uptodate')
    }
  }

  return (
    <div className="h-full overflow-auto animate-[fadeIn_0.2s_ease]">
      <div className="max-w-xl mx-auto px-6 py-8 flex flex-col gap-8">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Settings
        </h2>

        {/* Appearance */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Appearance
          </h3>
          <div
            className="rounded-xl border p-4 flex items-center justify-between"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Theme
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </div>
            </div>
            <button
              onClick={toggle}
              className="relative w-12 h-7 rounded-full transition-all duration-300"
              style={{
                background: theme === 'dark' ? 'var(--color-accent)' : '#e5e7eb',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center"
                style={{
                  transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
                }}
              >
                {theme === 'dark' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </section>

        {/* Accent Color */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Accent Color
          </h3>
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map(c => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                  style={{
                    background: c,
                    borderColor: accentColor === c ? 'var(--color-text)' : 'transparent',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor || (theme === 'dark' ? '#60a5fa' : '#3b82f6')}
                onChange={e => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                {accentColor || (theme === 'dark' ? '#60a5fa' : '#3b82f6')}
              </span>
              {accentColor && (
                <button
                  onClick={resetAccentColor}
                  className="ml-auto px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-85"
                  style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Theme Schedule */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Auto Switch
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                Schedule light/dark mode
              </span>
              <button
                onClick={() => setSchedule({ ...schedule, enabled: !schedule.enabled })}
                className="relative w-12 h-7 rounded-full transition-all duration-300"
                style={{ background: schedule.enabled ? 'var(--color-accent)' : '#e5e7eb' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
                  style={{ transform: schedule.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
            {schedule.enabled && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Light mode from
                  </label>
                  <input
                    type="time"
                    value={schedule.lightStart}
                    onChange={e => setSchedule({ ...schedule, lightStart: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg text-sm outline-none border"
                    style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Light mode until
                  </label>
                  <input
                    type="time"
                    value={schedule.lightEnd}
                    onChange={e => setSchedule({ ...schedule, lightEnd: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg text-sm outline-none border"
                    style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* App Name */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            App Name
          </h3>
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <input
              type="text"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium outline-none border"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            />
          </div>
        </section>

        {/* App Icon */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            App Icon
          </h3>
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              {iconPath ? (
                <img src={convertFileSrc(iconPath)} className="w-10 h-10 rounded-lg" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--color-surface-alt)' }} />
              )}
              <span className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {iconPath ? iconPath.split('/').pop() : 'Default icon'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={pickIcon}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {iconPath ? 'Change Icon' : 'Choose Icon'}
              </button>
              {iconPath && (
                <button
                  onClick={resetIcon}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                  style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Autostart */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Startup
          </h3>
          <div
            className="rounded-xl border p-4 flex items-center justify-between"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Launch at login
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {autostartOn ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <button
              onClick={handleAutostartToggle}
              className="relative w-12 h-7 rounded-full transition-all duration-300"
              style={{ background: autostartOn ? 'var(--color-accent)' : '#e5e7eb' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
                style={{ transform: autostartOn ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Notifications
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Enable notifications
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {notifConfig.enabled ? 'On' : 'Off'}
                </div>
              </div>
              <button
                onClick={() => updateNotifConfig({ enabled: !notifConfig.enabled })}
                className="relative w-12 h-7 rounded-full transition-all duration-300"
                style={{ background: notifConfig.enabled ? 'var(--color-accent)' : '#e5e7eb' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
                  style={{ transform: notifConfig.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            {notifConfig.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>Due todos</span>
                  <button
                    onClick={() => updateNotifConfig({ notifyTodos: !notifConfig.notifyTodos })}
                    className="relative w-10 h-6 rounded-full transition-all duration-300"
                    style={{ background: notifConfig.notifyTodos ? 'var(--color-accent)' : '#e5e7eb' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                      style={{ transform: notifConfig.notifyTodos ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>Event reminders</span>
                  <button
                    onClick={() => updateNotifConfig({ notifyEvents: !notifConfig.notifyEvents })}
                    className="relative w-10 h-6 rounded-full transition-all duration-300"
                    style={{ background: notifConfig.notifyEvents ? 'var(--color-accent)' : '#e5e7eb' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                      style={{ transform: notifConfig.notifyEvents ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                <button
                  onClick={async () => {
                    try {
                      let granted = await isPermissionGranted()
                      if (!granted) {
                        const permission = await requestPermission()
                        granted = permission === 'granted'
                      }
                      if (granted) {
                        sendNotification({ title: 'Test Notification', body: 'Benachrichtigungen funktionieren!' })
                      }
                    } catch {
                      // not in Tauri
                    }
                  }}
                  className="self-start px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                  style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
                >
                  Test Notification
                </button>
              </>
            )}
          </div>
        </section>

        {/* Link Groups */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Quick Links
          </h3>
          <div
            className="rounded-xl border p-4 flex items-center justify-between"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Link Groups
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                Organize links into groups
              </div>
            </div>
            <button
              onClick={() => {
                const next = !linkGroupsEnabled
                setLinkGroupsEnabled(next)
                localStorage.setItem('link_groups_enabled', String(next))
              }}
              className="relative w-12 h-7 rounded-full transition-all duration-300"
              style={{ background: linkGroupsEnabled ? 'var(--color-accent)' : '#e5e7eb' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
                style={{ transform: linkGroupsEnabled ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </section>

        {/* Documents folder */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Documents Folder
          </h3>
          <div
            className="rounded-xl border p-4"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>
              {rootPath ? (
                <div className="flex items-center gap-2">
                  <span className="shrink-0">📂</span>
                  <span className="truncate font-mono text-xs">{rootPath}</span>
                </div>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  No folder selected
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handlePickFolder}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {rootPath ? 'Change Folder' : 'Choose Folder'}
              </button>
              {rootPath && (
                <button
                  onClick={handleClearFolder}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                  style={{
                    background: 'var(--color-surface-alt)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Backup */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Backup
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Export or restore your data (events, todos, links, labels).
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const dir = await openDialog({ directory: true, multiple: false, title: 'Export to folder' })
                  if (!dir) return
                  const files = ['events.json', 'todos.json', 'links.json', 'labels.json']
                  for (const f of files) {
                    try {
                      const data = await readJson(f)
                      if (data !== null) {
                        await writeTextFile(`${dir}/${f}`, JSON.stringify(data, null, 2))
                      }
                    } catch {
                      // file may not exist
                    }
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                Export Data
              </button>
              <button
                onClick={async () => {
                  const dir = await openDialog({ directory: true, multiple: false, title: 'Import from folder' })
                  if (!dir) return
                  const files = ['events.json', 'todos.json', 'links.json', 'labels.json']
                  for (const f of files) {
                    try {
                      const content = await readTextFile(`${dir}/${f}`)
                      const parsed = JSON.parse(content)
                      await writeJson(f, parsed)
                    } catch {
                      // file may not exist
                    }
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Import Data
              </button>
            </div>
          </div>
        </section>

        {/* Auto Backup */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Auto Backup
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Automatic backups
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {backupConfig.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <button
                onClick={() => updateBackupConfig({ enabled: !backupConfig.enabled })}
                className="relative w-12 h-7 rounded-full transition-all duration-300"
                style={{ background: backupConfig.enabled ? 'var(--color-accent)' : '#e5e7eb' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
                  style={{ transform: backupConfig.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
            {backupConfig.enabled && (
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>Interval</span>
                <div className="flex gap-2">
                  {(['daily', 'weekly'] as const).map(i => (
                    <button
                      key={i}
                      onClick={() => updateBackupConfig({ interval: i })}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"
                      style={{
                        background: backupConfig.interval === i ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                        color: backupConfig.interval === i ? '#fff' : 'var(--color-text-secondary)',
                      }}
                    >
                      {i === 'daily' ? 'Daily' : 'Weekly'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Data */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Data
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={() => {
                if (window.confirm('Delete all events? This cannot be undone.')) clearEvents()
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95 self-start"
              style={{
                background: '#ef4444',
                color: '#fff',
              }}
            >
              Clear All Events
            </button>
            <button
              onClick={async () => {
                if (!window.confirm('Delete ALL data? This includes events, todos, links, labels, stats, and users. This cannot be undone!')) return
                clearEvents()
                await writeJson('todos.json', [])
                await writeJson('links.json', [])
                await writeJson('labels.json', [])
                await writeJson('stats.json', { todoCompletions: {}, pomodoroSessions: {}, pomodoroFocusMinutes: {} })
                await writeJson('users.json', [])
                localStorage.removeItem('auth_config')
                localStorage.removeItem('auth_crypto_key')
                localStorage.removeItem('notification_config')
                onLogout()
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95 self-start"
              style={{
                background: '#dc2626',
                color: '#fff',
              }}
            >
              Clear All Data
            </button>
          </div>
        </section>

        {/* Tags */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Todo Tags
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag.name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: tag.color + '22', color: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => updateTags(tags.filter(t => t.name !== tag.name))}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                placeholder="Tag name"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                maxLength={20}
              />
              <input
                type="color"
                value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              />
              <button
                onClick={() => {
                  if (!newTagName.trim()) return
                  if (tags.some(t => t.name === newTagName.trim())) return
                  updateTags([...tags, { name: newTagName.trim(), color: newTagColor }])
                  setNewTagName('')
                  setNewTagColor('#3b82f6')
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95 shrink-0"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard Widgets */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Dashboard
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {[
              { key: 'events', label: 'Today\'s Events' },
              { key: 'countdown', label: 'Todo Countdown' },
              { key: 'links', label: 'Quick Links' },
              { key: 'stats', label: 'Statistics' },
            ].map(w => (
              <div key={w.key} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{w.label}</span>
                <button
                  onClick={() => {
                    const next = { ...dashboardWidgets, [w.key]: !dashboardWidgets[w.key] }
                    setDashboardWidgets(next)
                    localStorage.setItem('dashboard_widgets', JSON.stringify(next))
                  }}
                  className="relative w-10 h-6 rounded-full transition-all duration-300"
                  style={{ background: dashboardWidgets[w.key] ? 'var(--color-accent)' : '#e5e7eb' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                    style={{ transform: dashboardWidgets[w.key] ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Updates */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Updates
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>
              {appName} v1.0.6
            </div>
            <button
              onClick={handleCheckUpdates}
              disabled={updateStatus === 'checking'}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95 self-start disabled:opacity-50"
              style={{
                background: updateStatus === 'available'
                  ? 'var(--color-accent)'
                  : 'var(--color-surface-alt)',
                color: updateStatus === 'available' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {updateStatus === 'idle' ? 'Check for Updates' :
               updateStatus === 'checking' ? 'Checking…' :
               updateStatus === 'uptodate' ? 'Up to date ✓' :
               `Update v${updateVersion} available`}
            </button>
            {updateStatus === 'available' && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Install from the next release on GitHub
              </p>
            )}
          </div>
        </section>

        {/* PIN */}
        {!authConfig.enabled && (
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            App PIN
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            {pin ? (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>PIN is set</span>
                <button
                  onClick={() => {
                    setPin('')
                    localStorage.removeItem('app_pin')
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  Remove PIN
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="password"
                  placeholder="New PIN (4-6 digits)"
                  value={newPin}
                  onChange={e => { setNewPin(e.target.value); setPinError('') }}
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                />
                <input
                  type="password"
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={e => { setConfirmPin(e.target.value); setPinError('') }}
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                />
                {pinError && <span className="text-xs" style={{ color: '#ef4444' }}>{pinError}</span>}
                <button
                  onClick={() => {
                    if (!newPin || newPin.length < 4) { setPinError('PIN must be 4-6 digits'); return }
                    if (newPin !== confirmPin) { setPinError('PINs do not match'); return }
                    setPin(newPin)
                    setNewPin('')
                    setConfirmPin('')
                    localStorage.setItem('app_pin', newPin)
                  }}
                  className="self-start px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                >
                  Set PIN
                </button>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Login */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Login
          </h3>
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Enable Login
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {authConfig.enabled ? 'Multi-user mode' : 'Single-user mode'}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (authConfig.enabled) {
                    if (authUsers.length > 1) return
                    await onDisableAuth()
                  } else {
                    setRegUsername(''); setRegPassword(''); setRegConfirm(''); setRegError('')
                    setEnableModalOpen(true)
                  }
                }}
                className="relative w-12 h-7 rounded-full transition-all duration-300"
                style={{ background: authConfig.enabled ? 'var(--color-accent)' : '#e5e7eb', opacity: authConfig.enabled && authUsers.length > 1 ? 0.4 : 1 }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
                  style={{ transform: authConfig.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
            {authConfig.enabled && authUsers.length > 1 && (
              <p className="text-xs" style={{ color: '#ef4444' }}>
                Delete other users first to switch to single-user mode
              </p>
            )}

            {authConfig.enabled && (
              <>
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {currentUser}
                      </span>
                      <button
                        onClick={onLogout}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-85 active:scale-95"
                        style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
                      >
                        Logout
                      </button>
                    </div>
                    <button
                      onClick={() => { setPwModalOpen(true); setOldPw(''); setNewPw(''); setConfirmPw(''); setPwError('') }}
                      className="self-start px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-85 active:scale-95"
                      style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
                    >
                      Change Password
                    </button>
                  </>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Restart the app or log in via the login screen
                  </p>
                )}

                {authUsers.length > 0 && (
                  <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      All Users ({authUsers.length})
                    </div>
                    {authUsers.map(u => (
                      <div key={u.username} className="flex items-center justify-between py-1">
                        <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                          {u.username}
                          {u.username === currentUser && <span className="text-xs ml-1" style={{ color: 'var(--color-accent)' }}>(you)</span>}
                        </span>
                        {u.username !== currentUser && (
                          <button
                            onClick={() => onDeleteUser(u.username)}
                            className="px-2 py-0.5 rounded text-xs font-medium transition-all hover:opacity-85"
                            style={{ background: '#ef4444', color: '#fff' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Password change modal */}
        <Modal open={pwModalOpen} onClose={() => setPwModalOpen(false)} title="Change Password">
          <div className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Current password"
              value={oldPw}
              onChange={e => setOldPw(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleChangePassword() }}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            />
            {pwError && <span className="text-xs" style={{ color: '#ef4444' }}>{pwError}</span>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPwModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>

        {/* Enable auth modal */}
        <Modal open={enableModalOpen} onClose={() => setEnableModalOpen(false)} title="Create Account">
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              This will enable multi-user mode and encrypt your data.
            </p>
            <input
              placeholder="Username"
              value={regUsername}
              onChange={e => setRegUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={regPassword}
              onChange={e => setRegPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={regConfirm}
              onChange={e => setRegConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEnableAuth() }}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            />
            {regError && <span className="text-xs" style={{ color: '#ef4444' }}>{regError}</span>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEnableModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-85 active:scale-95"
                style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEnableAuth}
                disabled={enableBusy}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-85 active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {enableBusy ? 'Please wait…' : 'Enable Login'}
              </button>
            </div>
          </div>
        </Modal>

        {/* About */}
        <section>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            About
          </h3>
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p>{appName} v1.0.6</p>
            <p className="mt-1">All data stored locally. No telemetry. No accounts.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
