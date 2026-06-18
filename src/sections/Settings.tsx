import { useState, useEffect, useCallback } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { appDataDir } from '@tauri-apps/api/path'
import { check } from '@tauri-apps/plugin-updater'
import { isTauri } from '@tauri-apps/api/core'
import { useTheme } from '../hooks/useTheme'
import { useEvents } from '../hooks/useEvents'

export default function Settings() {
  const { theme, toggle } = useTheme()
  const { clearEvents } = useEvents()
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'uptodate' | 'available'>('idle')
  const [updateVersion, setUpdateVersion] = useState('')

  useEffect(() => {
    setRootPath(localStorage.getItem('documents_root'))
  }, [])

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

  async function handleCheckUpdates() {
    if (!isTauri()) return
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
                  const base = await appDataDir()
                  for (const f of files) {
                    try {
                      const content = await readTextFile(`${base}uni-dash/${f}`)
                      await writeTextFile(`${dir}/${f}`, content)
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
                  const base = await appDataDir()
                  for (const f of files) {
                    try {
                      const content = await readTextFile(`${dir}/${f}`)
                      await writeTextFile(`${base}uni-dash/${f}`, content)
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
              Uni Dash v0.1.2
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
              {updateStatus === 'idle' && 'Check for Updates'}
              {updateStatus === 'checking' && 'Checking…'}
              {updateStatus === 'uptodate' && 'Up to date ✓'}
              {updateStatus === 'available' && `Update v${updateVersion} available`}
            </button>
            {updateStatus === 'available' && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Install from the next release on GitHub
              </p>
            )}
          </div>
        </section>

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
            <p>Uni Dash v0.1.2</p>
            <p className="mt-1">All data stored locally. No telemetry. No accounts.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
