import { useState, useCallback, useEffect, useMemo } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { open as openShell } from '@tauri-apps/plugin-shell'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useDocuments, getFileKind, formatSize, formatDate } from '../hooks/useDocuments'
import FileIcon from '../components/FileIcon'
import ContextMenu from '../components/ContextMenu'

export default function Documents() {
  const {
    rootPath,
    entries,
    labels,
    loading,
    setRoot,
    navigateTo,
    navigateUp,
    breadcrumbs,
    setLabel,
    removeLabel,
  } = useDocuments()

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{
    x: number
    y: number
    path: string
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const currentLabelColor = ctxMenu ? labels[ctxMenu.path] || '' : ''

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter(e => e.name.toLowerCase().includes(q))
  }, [entries, searchQuery])

  const handlePickFolder = useCallback(async () => {
    const dir = await openDialog({
      directory: true,
      multiple: false,
      title: 'Select Documents Folder',
    })
    if (dir) {
      await setRoot(dir)
    }
  }, [setRoot])

  const handleRowClick = useCallback(
    (e: React.MouseEvent, path: string, isDir: boolean) => {
      setSelectedPath(path)
      if (e.detail === 2) {
        if (isDir) {
          navigateTo(path)
        } else {
          openShell(path)
        }
      }
    },
    [navigateTo],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedPath(path)
      setCtxMenu({ x: e.clientX, y: e.clientY, path })
    },
    [],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = filteredEntries.findIndex(en => en.path === selectedPath)
        const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1
        if (next >= 0 && next < filteredEntries.length) {
          setSelectedPath(filteredEntries[next].path)
        }
      }
      if (e.key === 'Enter' && selectedPath) {
        const entry = filteredEntries.find(en => en.path === selectedPath)
        if (entry) {
          if (entry.isDir) navigateTo(entry.path)
          else openShell(entry.path)
        }
      }
    },
    [filteredEntries, selectedPath, navigateTo],
  )

  // Load preview content when selected file changes
  useEffect(() => {
    if (!previewOpen || !selectedPath) {
      setPreviewContent(null)
      return
    }
    const entry = filteredEntries.find(en => en.path === selectedPath)
    if (!entry || entry.isDir) {
      setPreviewContent(null)
      return
    }
    const ext = entry.name.split('.').pop()?.toLowerCase()
    const textExts = ['txt', 'md', 'mkd', 'markdown', 'rtf', 'css', 'html', 'js', 'ts', 'tsx', 'jsx', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'sh', 'bash', 'zsh', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'csv', 'env', 'gitignore', 'svg']
    if (!ext || !textExts.includes(ext)) {
      setPreviewContent(null)
      return
    }
    setPreviewLoading(true)
    readTextFile(selectedPath)
      .then(content => setPreviewContent(content))
      .catch(() => setPreviewContent(null))
      .finally(() => setPreviewLoading(false))
  }, [previewOpen, selectedPath, filteredEntries])

  if (!rootPath) {
    return (
      <div className="h-full flex items-center justify-center animate-[fadeIn_0.3s_ease]">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path d="M4 9a2 2 0 012-2h8l2 2h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" fill="#5AC8FA" />
              <path d="M4 11a2 2 0 012-2h20a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V11z" fill="#81D8FE" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Documents
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Select a folder to browse your documents
          </p>
          <button
            onClick={handlePickFolder}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-[0.97]"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            Choose Folder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col outline-none animate-[fadeIn_0.2s_ease]"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={e => e.preventDefault()}
      onDragOver={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => setDragOver(false)}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={navigateUp}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-(--color-surface-alt) active:scale-90 shrink-0"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Go up"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l-7 7 7 7" />
              </svg>
            </button>

            <div className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto scrollbar-none">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1 shrink-0">
                  {i > 0 && (
                    <span className="mx-0.5" style={{ color: 'var(--color-text-secondary)' }}>/</span>
                  )}
                  <button
                    onClick={() => navigateTo(crumb.path)}
                    className="transition-all duration-200 hover:opacity-70 truncate max-w-36 px-1 -mx-1 rounded"
                    style={{
                      color: i === breadcrumbs.length - 1 ? 'var(--color-text)' : 'var(--color-text-secondary)',
                      fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                    }}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search files…"
              className="flex-1 min-w-0 max-w-xs px-3 py-1.5 text-sm rounded-lg border outline-none transition-all mx-2"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />

            <button
              onClick={() => setPreviewOpen(o => !o)}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-(--color-surface-alt) active:scale-90 shrink-0"
              style={{
                color: previewOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
              title="Toggle preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </button>
          </div>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed pointer-events-none animate-[fadeIn_0.15s_ease]"
          style={{
            borderColor: 'var(--color-accent)',
            background: 'var(--color-accent)',
            opacity: 0.08,
          }}
        >
          <span className="text-base font-medium" style={{ color: 'var(--color-accent)' }}>
            Drop files to copy
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Table section */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Table header */}
          <div
            className="flex items-center gap-3 px-5 py-2 text-xs font-medium border-b shrink-0 select-none"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <div className="w-[34px] shrink-0" />
            <div className="flex-1 min-w-0">Name</div>
            <div className="w-40 shrink-0 hidden sm:block">Date Modified</div>
            <div className="w-20 shrink-0 hidden md:block text-right">Size</div>
            <div className="w-36 shrink-0 hidden lg:block">Kind</div>
          </div>

          {/* Table body */}
          <div className="flex-1 overflow-auto">
            {loading && entries.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm animate-[fadeIn_0.3s_ease]" style={{ color: 'var(--color-text-secondary)' }}>
                Loading…
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm animate-[fadeIn_0.3s_ease]" style={{ color: 'var(--color-text-secondary)' }}>
                {searchQuery ? 'No matching files' : 'Empty folder'}
              </div>
            ) : (
              <div>
                {filteredEntries.map((entry, idx) => {
                  const isSelected = selectedPath === entry.path
                  const label = labels[entry.path]
                  return (
                    <div
                      key={entry.path}
                      onClick={e => handleRowClick(e, entry.path, entry.isDir)}
                      onContextMenu={e => handleContextMenu(e, entry.path)}
                      className="flex items-center gap-3 px-5 py-1.5 text-sm cursor-pointer border-b transition-all duration-150"
                      style={{
                        background: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: 'var(--color-border)',
                        color: isSelected ? '#fff' : 'var(--color-text)',
                        animation: `fadeSlideIn 0.25s ease ${idx * 0.02}s both`,
                      }}
                    >
                      {/* Icon + label dot */}
                      <div className="w-[34px] h-[34px] shrink-0 flex items-center justify-center relative">
                        {label && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-200"
                            style={{
                              background: label,
                              borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-bg)',
                            }}
                          />
                        )}
                        <div className="transition-transform duration-200 group-hover:scale-110">
                          <FileIcon name={entry.name} isDir={entry.isDir} />
                        </div>
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0 font-medium truncate">{entry.name}</div>

                      {/* Date Modified */}
                      <div
                        className="w-40 shrink-0 hidden sm:block truncate"
                        style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary)' }}
                      >
                        {formatDate(entry.mtime)}
                      </div>

                      {/* Size */}
                      <div
                        className="w-20 shrink-0 hidden md:block text-right tabular-nums"
                        style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary)' }}
                      >
                        {entry.isDir ? '—' : formatSize(entry.size)}
                      </div>

                      {/* Kind */}
                      <div
                        className="w-36 shrink-0 hidden lg:block truncate"
                        style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary)' }}
                      >
                        {getFileKind(entry.name, entry.isDir)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Preview panel */}
        {previewOpen && (
          <div
            className="w-80 shrink-0 border-l overflow-auto animate-[fadeIn_0.15s_ease]"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            {selectedPath ? (() => {
              const entry = filteredEntries.find(en => en.path === selectedPath)
              if (!entry) return null
              const ext = entry.name.split('.').pop()?.toLowerCase()
              const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
              const isImage = ext && imageExts.includes(ext)
              const isPdf = ext === 'pdf'
              return (
                <div className="p-4 flex flex-col gap-3">
                  {/* File icon */}
                  <div className="flex justify-center py-4">
                    <div className="scale-150">
                      <FileIcon name={entry.name} isDir={entry.isDir} />
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {entry.name}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="flex justify-between">
                      <span>Kind</span>
                      <span>{getFileKind(entry.name, entry.isDir)}</span>
                    </div>
                    {!entry.isDir && (
                      <div className="flex justify-between">
                        <span>Size</span>
                        <span>{formatSize(entry.size)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Modified</span>
                      <span>{formatDate(entry.mtime)}</span>
                    </div>
                  </div>

                  {/* Image preview */}
                  {isImage && (
                    <img
                      src={convertFileSrc(entry.path)}
                      alt={entry.name}
                      className="w-full rounded-lg border"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  )}

                  {/* PDF preview */}
                  {isPdf && (
                    <iframe
                      src={convertFileSrc(entry.path)}
                      className="w-full h-[500px] rounded-lg border-0"
                      title={entry.name}
                    />
                  )}

                  {/* Text preview */}
                  {!isImage && !isPdf && previewLoading && (
                    <div className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                      Loading preview…
                    </div>
                  )}
                  {!isImage && !isPdf && !previewLoading && previewContent !== null && (
                    <div
                      className="border rounded-lg p-3 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                      }}
                    >
                      {previewContent.slice(0, 3000)}
                      {previewContent.length > 3000 && (
                        <div className="pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          … {previewContent.length - 3000} more characters
                        </div>
                      )}
                    </div>
                  )}
                  {!isImage && !isPdf && !previewLoading && previewContent === null && (
                    <div className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                      {entry.isDir ? 'Select a file to preview' : 'No preview available'}
                    </div>
                  )}
                </div>
              )
            })() : (
              <div className="flex items-center justify-center h-full text-sm p-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Select a file to preview
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div className="animate-[fadeIn_0.12s_ease]">
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            currentColor={currentLabelColor}
            onSelect={color => setLabel(ctxMenu.path, color)}
            onRemove={() => removeLabel(ctxMenu.path)}
            onClose={() => setCtxMenu(null)}
          />
        </div>
      )}
    </div>
  )
}
