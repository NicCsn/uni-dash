import { useState, useEffect, useCallback, useRef } from 'react'
import { readDir, copyFile, stat } from '@tauri-apps/plugin-fs'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import type { DocEntry, LabelEntry } from '../types'
import { readJson, writeJson } from '../lib/storage'

const LABELS_FILE = 'labels.json'

function loadRoot(): string | null {
  return localStorage.getItem('documents_root')
}

function saveRoot(path: string) {
  localStorage.setItem('documents_root', path)
}

export function getFileKind(name: string, isDir: boolean): string {
  if (isDir) return 'Folder'
  const ext = name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    pdf: 'PDF Document', jpg: 'Image', jpeg: 'Image',
    png: 'Image', gif: 'Image', webp: 'Image', svg: 'Image',
    doc: 'Word Document', docx: 'Word Document',
    xls: 'Excel Spreadsheet', xlsx: 'Excel Spreadsheet',
    ppt: 'PowerPoint', pptx: 'PowerPoint',
    txt: 'Text Document', rtf: 'Rich Text',
    zip: 'Archive', tar: 'Archive', gz: 'Archive',
    mp4: 'Movie', mov: 'Movie', avi: 'Movie', mkv: 'Movie',
    mp3: 'Audio', wav: 'Audio', flac: 'Audio', aac: 'Audio',
    css: 'Stylesheet', html: 'HTML Document',
    js: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
    py: 'Python Script', rs: 'Rust Source',
  }
  return map[ext || ''] || 'Document'
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(d: Date | null): string {
  if (!d) return '--'
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadEntries(path: string): Promise<DocEntry[]> {
  const list = await readDir(path)
  const filtered = list.filter(e => e.name && !e.name.startsWith('.'))
  const withStats = await Promise.all(
    filtered.map(async e => {
      const fullPath = `${path}/${e.name!}`
      try {
        const info = await stat(fullPath)
        return {
          name: e.name!,
          path: fullPath,
          isDir: !!e.isDirectory,
          size: info.size,
          mtime: info.mtime,
        }
      } catch {
        return {
          name: e.name!,
          path: fullPath,
          isDir: !!e.isDirectory,
          size: 0,
          mtime: null,
        }
      }
    }),
  )
  withStats.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return withStats
}

function entriesDigest(entries: DocEntry[]): string {
  return entries.map(d => `${d.name}|${d.size}|${d.mtime?.getTime() || 0}`).join(',')
}

export function useDocuments() {
  const [rootPath, setRootPath] = useState<string | null>(loadRoot)
  const [currentPath, setCurrentPath] = useState<string>('')
  const [entries, setEntries] = useState<DocEntry[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const lastDigestRef = useRef('')

  // Load labels
  useEffect(() => {
    readJson<LabelEntry[]>(LABELS_FILE).then(data => {
      if (data) {
        const map: Record<string, string> = {}
        for (const l of data) map[l.path] = l.color
        setLabels(map)
      }
    })
  }, [])

  // Persist labels
  const persistLabels = useCallback(async (map: Record<string, string>) => {
    setLabels(map)
    const arr: LabelEntry[] = Object.entries(map).map(([path, color]) => ({ path, color }))
    await writeJson(LABELS_FILE, arr)
  }, [])

  // Navigate to a path
  const navigateTo = useCallback(async (path: string) => {
    setLoading(true)
    setCurrentPath(path)
    try {
      const docs = await loadEntries(path)
      setEntries(docs)
      lastDigestRef.current = entriesDigest(docs)
    } catch {
      setEntries([])
    }
    setLoading(false)
  }, [])

  // Polling for changes
  useEffect(() => {
    if (!currentPath) return
    const poll = async () => {
      try {
        const docs = await loadEntries(currentPath)
        const digest = entriesDigest(docs)
        if (digest !== lastDigestRef.current) {
          setEntries(docs)
          lastDigestRef.current = digest
        }
      } catch {
        // ignore
      }
    }
    pollRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollRef.current)
  }, [currentPath])

  // Set root
  const setRoot = useCallback(
    async (path: string) => {
      saveRoot(path)
      setRootPath(path)
      await navigateTo(path)
    },
    [navigateTo],
  )

  // Initial navigation
  useEffect(() => {
    if (rootPath && !currentPath) {
      navigateTo(rootPath)
    }
  }, [rootPath, currentPath, navigateTo])

  // Breadcrumbs
  const breadcrumbs = (() => {
    if (!currentPath) return []
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs: { name: string; path: string }[] = []
    for (let i = 0; i < parts.length; i++) {
      crumbs.push({
        name: parts[i],
        path: '/' + parts.slice(0, i + 1).join('/'),
      })
    }
    return crumbs
  })()

  // Navigate up
  const navigateUp = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean)
    if (parts.length <= 1) return
    const parent = '/' + parts.slice(0, -1).join('/')
    navigateTo(parent)
  }, [currentPath, navigateTo])

  // Set label
  const setLabel = useCallback(
    async (path: string, color: string) => {
      const next = { ...labels, [path]: color }
      await persistLabels(next)
    },
    [labels, persistLabels],
  )

  // Remove label
  const removeLabel = useCallback(
    async (path: string) => {
      const next = { ...labels }
      delete next[path]
      await persistLabels(next)
    },
    [labels, persistLabels],
  )

  // Handle drag-drop via Tauri
  const setupDropHandler = useCallback(() => {
    let cleanup: (() => void) | undefined
    const setup = async () => {
      try {
        const w = getCurrentWebviewWindow()
        cleanup = await w.onDragDropEvent(async event => {
          if (event.payload.type === 'drop') {
            const paths = event.payload.paths as string[]
            if (!paths.length || !currentPath) return
            for (const src of paths) {
              const name = src.split('/').pop() || src.split('\\').pop()
              if (!name) continue
              const dest = `${currentPath}/${name}`
              try {
                await copyFile(src, dest)
              } catch {
                // file may already exist
              }
            }
          }
        })
      } catch {
        // Tauri drag-drop API not available
      }
    }
    setup()
    return () => cleanup?.()
  }, [currentPath])

  useEffect(() => {
    return setupDropHandler()
  }, [setupDropHandler])

  return {
    rootPath,
    currentPath,
    entries,
    labels,
    loading,
    setRoot,
    navigateTo,
    navigateUp,
    breadcrumbs,
    setLabel,
    removeLabel,
  }
}
