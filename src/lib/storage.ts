import { appDataDir } from '@tauri-apps/api/path'
import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs'

const APP_DIR = 'uni-dash'

async function ensureDir(): Promise<string> {
  const base = await appDataDir()
  const dir = `${base}${APP_DIR}`
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

export async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const dir = await ensureDir()
    const content = await readTextFile(`${dir}/${filename}`)
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const dir = await ensureDir()
  await writeTextFile(`${dir}/${filename}`, JSON.stringify(data, null, 2))
}
