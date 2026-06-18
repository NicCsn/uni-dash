import { useEffect, useRef } from 'react'
import type { BackupConfig } from '../types'
import { readJson } from '../lib/storage'

async function ensureBackupDir(dateStr: string): Promise<string> {
  const base = await (await import('@tauri-apps/api/path')).appDataDir()
  const dir = base.endsWith('/') ? `${base}uni-dash-backups/${dateStr}` : `${base}/uni-dash-backups/${dateStr}`
  const { mkdir, exists } = await import('@tauri-apps/plugin-fs')
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

async function runBackup() {
  try {
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const dstDir = await ensureBackupDir(dateStr)

    const files = ['events.json', 'todos.json', 'links.json', 'labels.json', 'stats.json']
    for (const file of files) {
      try {
        const data = await readJson(file)
        if (data !== null) {
          // Read auth-aware via readJson, write backup directly
          const { writeTextFile } = await import('@tauri-apps/plugin-fs')
          await writeTextFile(`${dstDir}/${file}`, JSON.stringify(data, null, 2))
        }
      } catch {
        // file may not exist
      }
    }
  } catch {
    // backup failed silently
  }
}

export function useBackup() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    let cfg: BackupConfig
    try {
      const stored = localStorage.getItem('backup_config')
      cfg = stored ? JSON.parse(stored) : { enabled: false, interval: 'daily' }
    } catch {
      return
    }
    if (!cfg.enabled) return

    const intervalMs = cfg.interval === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000

    runBackup()
    intervalRef.current = setInterval(runBackup, intervalMs)
    return () => clearInterval(intervalRef.current)
  }, [])
}
