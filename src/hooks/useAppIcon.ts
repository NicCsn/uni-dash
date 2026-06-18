import { useState, useCallback, useEffect } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

const STORAGE_KEY = 'app_icon'

function loadIcon(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

function saveIcon(path: string | null) {
  if (path) {
    localStorage.setItem(STORAGE_KEY, path)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function useAppIcon() {
  const [iconPath, setIconPath] = useState<string | null>(loadIcon)

  useEffect(() => {
    if (iconPath) {
      invoke('set_app_icon', { path: iconPath }).catch(() => {})
    }
  }, [])

  const setIcon = useCallback(async (path: string | null) => {
    if (path) {
      saveIcon(path)
      setIconPath(path)
      try {
        await invoke('set_app_icon', { path })
      } catch {
        // Tauri command not available outside app
      }
    }
  }, [])

  const pickIcon = useCallback(async () => {
    try {
      const path = await openDialog({
        multiple: false,
        title: 'Select App Icon',
        filters: [{ name: 'Images', extensions: ['png', 'icns', 'ico'] }],
      })
      if (path) {
        await setIcon(path)
      }
    } catch {
      // dialog not available outside Tauri
    }
  }, [setIcon])

  const resetIcon = useCallback(() => {
    saveIcon(null)
    setIconPath(null)
  }, [])

  return { iconPath, setIcon, pickIcon, resetIcon } as const
}
