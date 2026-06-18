import { appDataDir } from '@tauri-apps/api/path'
import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { encryptData, decryptData } from './crypto'

const APP_DIR = 'uni-dash'
const USERS_FILE = 'users.json'

let _authUsername: string | null = null
let _cryptoKey: CryptoKey | null = null

export function setAuthState(username: string | null, key: CryptoKey | null) {
  _authUsername = username
  _cryptoKey = key
}

async function ensureDir(): Promise<string> {
  const base = await appDataDir()
  const dir = base.endsWith('/') ? `${base}${APP_DIR}` : `${base}/${APP_DIR}`
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

export async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const dir = await ensureDir()
    const file = _authUsername && filename !== USERS_FILE ? `${_authUsername}_${filename}` : filename
    const content = await readTextFile(`${dir}/${file}`)
    if (_cryptoKey && filename !== USERS_FILE) {
      const parsed = JSON.parse(content)
      const decrypted = await decryptData(_cryptoKey, parsed)
      return JSON.parse(decrypted) as T
    }
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const dir = await ensureDir()
  const file = _authUsername && filename !== USERS_FILE ? `${_authUsername}_${filename}` : filename
  let content = JSON.stringify(data, null, 2)
  if (_cryptoKey && filename !== USERS_FILE) {
    content = JSON.stringify(await encryptData(_cryptoKey, content))
  }
  await writeTextFile(`${dir}/${file}`, content)
}

export { ensureDir }
