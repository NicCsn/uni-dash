import { useState, useCallback } from 'react'

const STORAGE_KEY = 'app_name'
const DEFAULT_NAME = 'Uni Dash'

function loadName(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_NAME
}

function saveName(name: string) {
  localStorage.setItem(STORAGE_KEY, name)
}

export function useAppName() {
  const [appName, setAppNameState] = useState(loadName)

  const setAppName = useCallback((name: string) => {
    saveName(name)
    setAppNameState(name)
  }, [])

  return { appName, setAppName } as const
}
