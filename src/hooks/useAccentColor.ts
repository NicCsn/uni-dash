import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'accent_color'
const DEFAULT_COLOR = '#3b82f6'
const DARK_DEFAULT = '#60a5fa'

const PRESETS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
]

function loadColor(): string {
  return localStorage.getItem(STORAGE_KEY) || ''
}

function saveColor(color: string) {
  if (color) {
    localStorage.setItem(STORAGE_KEY, color)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function useAccentColor(theme: 'light' | 'dark') {
  const [accentColor, setAccentColorState] = useState(loadColor)

  useEffect(() => {
    const color = accentColor || (theme === 'dark' ? DARK_DEFAULT : DEFAULT_COLOR)
    document.documentElement.style.setProperty('--color-accent', color)
  }, [accentColor, theme])

  const setAccentColor = useCallback((color: string) => {
    saveColor(color)
    setAccentColorState(color)
  }, [])

  const resetAccentColor = useCallback(() => {
    saveColor('')
    setAccentColorState('')
  }, [])

  return { accentColor, setAccentColor, resetAccentColor, presets: PRESETS, defaultColor: DEFAULT_COLOR }
}
