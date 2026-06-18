import { check } from '@tauri-apps/plugin-updater'
import { isTauri } from '@tauri-apps/api/core'

export async function checkForUpdates() {
  if (!isTauri()) return
  try {
    const update = await check()
    if (update) {
      if (globalThis.confirm(`Update v${update.version} available – install now?`)) {
        await update.downloadAndInstall()
      }
    }
  } catch {
    // no network or no update
  }
}
