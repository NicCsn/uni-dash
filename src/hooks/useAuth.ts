import { useState, useEffect, useCallback } from 'react'
import type { UserRecord, AuthConfig } from '../types'
import { readJson, writeJson, setAuthState, ensureDir } from '../lib/storage'
import { generateSalt, hashPassword, generateKey, exportKey, wrapMasterKey, unwrapMasterKey, importKey } from '../lib/crypto'

const USERS_FILE = 'users.json'
const AUTH_CONFIG_KEY = 'auth_config'
const KEY_STORAGE_KEY = 'auth_crypto_key'

function loadConfig(): AuthConfig {
  try {
    const stored = localStorage.getItem(AUTH_CONFIG_KEY)
    return stored ? JSON.parse(stored) : { enabled: false, currentUser: null, sessionToken: null, keepLoggedIn: false }
  } catch {
    return { enabled: false, currentUser: null, sessionToken: null, keepLoggedIn: false }
  }
}

function saveConfig(cfg: AuthConfig) {
  localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(cfg))
}

function loadStoredKey(): string | null {
  return localStorage.getItem(KEY_STORAGE_KEY)
}

function storeKey(b64: string) {
  localStorage.setItem(KEY_STORAGE_KEY, b64)
}

function clearStoredKey() {
  localStorage.removeItem(KEY_STORAGE_KEY)
}

const DATA_FILES = ['todos.json', 'events.json', 'links.json', 'stats.json', 'labels.json']

export function useAuth() {
  const [config, setConfigState] = useState<AuthConfig>(loadConfig)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    readJson<UserRecord[]>(USERS_FILE).then(data => {
      if (data) setUsers(data)
      setLoading(false)
    })
  }, [])

  // Auto-restore session on mount
  useEffect(() => {
    if (!config.enabled) { setLoading(false); return }
    if (!config.currentUser) { setLoading(false); return }
    const b64 = loadStoredKey()
    if (!b64) { setLoading(false); return }
    importKey(b64).then(key => {
      setAuthState(config.currentUser!, key)
      setIsLoggedIn(true)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [config.enabled, config.currentUser])

  const persistUsers = useCallback(async (next: UserRecord[]) => {
    setUsers(next)
    await writeJson(USERS_FILE, next)
  }, [])

  const doLogin = useCallback(async (username: string, key: CryptoKey) => {
    const b64 = await exportKey(key)
    storeKey(b64)
    setAuthState(username, key)
    const cfg: AuthConfig = { enabled: true, currentUser: username, sessionToken: crypto.randomUUID(), keepLoggedIn: true }
    saveConfig(cfg)
    setConfigState(cfg)
    setIsLoggedIn(true)
  }, [])

  const enableAuth = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      if (!crypto.subtle) return 'Web Crypto API not available (non-secure context)'

      const key = await generateKey()
      const salt = await generateSalt()
      const pwHash = await hashPassword(password, salt)
      const encryptedKey = await wrapMasterKey(key, password, salt)

      const newUser: UserRecord = { username, salt, passwordHash: pwHash, encryptedKey, createdAt: new Date().toISOString() }

      for (const file of DATA_FILES) {
        const data = await readJson(file)
        if (data !== null) {
          setAuthState(username, key)
          await writeJson(file, data)
          setAuthState(null, null)
        }
      }

      await persistUsers([...users, newUser])
      await doLogin(username, key)
      return null
    } catch (e) {
      console.error('enableAuth:', e)
      return String(e)
    }
  }, [users, persistUsers, doLogin])

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const user = users.find(u => u.username === username)
      if (!user) return 'User not found'
      const pwHash = await hashPassword(password, user.salt)
      if (pwHash !== user.passwordHash) return 'Wrong password'
      const key = await unwrapMasterKey(user.encryptedKey, password, user.salt)
      await doLogin(username, key)
      return null
    } catch (e) {
      console.error('login:', e)
      return String(e)
    }
  }, [users, doLogin])

  const logout = useCallback(() => {
    setAuthState(null, null)
    clearStoredKey()
    const cfg = { ...config, currentUser: null, sessionToken: null }
    saveConfig(cfg)
    setConfigState(cfg)
    setIsLoggedIn(false)
  }, [config])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!config.currentUser) return false
    const user = users.find(u => u.username === config.currentUser)
    if (!user) return false
    const oldHash = await hashPassword(oldPassword, user.salt)
    if (oldHash !== user.passwordHash) return false
    const key = await unwrapMasterKey(user.encryptedKey, oldPassword, user.salt)
    const newSalt = await generateSalt()
    const newPwHash = await hashPassword(newPassword, newSalt)
    const newEncryptedKey = await wrapMasterKey(key, newPassword, newSalt)
    await persistUsers(users.map(u =>
      u.username === config.currentUser ? { ...u, salt: newSalt, passwordHash: newPwHash, encryptedKey: newEncryptedKey } : u,
    ))
    return true
  }, [users, config.currentUser, persistUsers])

  const deleteUser = useCallback(async (username: string) => {
    if (username === config.currentUser) return
    await persistUsers(users.filter(u => u.username !== username))
    // Delete user's data files
    try {
      const dir = await ensureDir()
      const { remove, exists } = await import('@tauri-apps/plugin-fs')
      for (const file of DATA_FILES) {
        const path = `${dir}/${username}_${file}`
        if (await exists(path)) await remove(path)
      }
    } catch {}
  }, [users, config.currentUser, persistUsers])

  const disableAuth = useCallback(async (): Promise<boolean> => {
    if (users.length > 1) return false

    // Decrypt and write plain for current user
    if (config.currentUser) {
      for (const file of DATA_FILES) {
        const data = await readJson(file)
        if (data !== null) {
          setAuthState(null, null)
          await writeJson(file, data)
        }
      }
      // Delete encrypted files
      try {
        const dir = await ensureDir()
        const { remove, exists } = await import('@tauri-apps/plugin-fs')
        for (const file of DATA_FILES) {
          const path = `${dir}/${config.currentUser}_${file}`
          if (await exists(path)) await remove(path)
        }
      } catch {}
    }

    setAuthState(null, null)
    clearStoredKey()
    const cfg: AuthConfig = { enabled: false, currentUser: null, sessionToken: null, keepLoggedIn: false }
    saveConfig(cfg)
    setConfigState(cfg)
    setIsLoggedIn(false)
    await persistUsers([])
    return true
  }, [users, config, persistUsers])

  return { users, config, isLoggedIn, loading, enableAuth, login, logout, changePassword, deleteUser, disableAuth }
}
