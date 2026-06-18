import { useState, useMemo } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import { useLinks } from '../hooks/useLinks'
import Modal from '../components/Modal'

interface FormData {
  title: string
  url: string
  emoji: string
  group: string
}

const emptyForm: FormData = { title: '', url: '', emoji: '🔗', group: '' }

export default function QuickLinks() {
  const { links, addLink, removeLink } = useLinks()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)

  const groupsEnabled = useMemo(() => localStorage.getItem('link_groups_enabled') === 'true', [])

  const grouped = useMemo(() => {
    if (!groupsEnabled) return null
    const map = new Map<string, typeof links>()
    for (const link of links) {
      const g = link.group || 'Uncategorized'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(link)
    }
    return map
  }, [links, groupsEnabled])

  function handleOpen(url: string) {
    const secure = url.startsWith('https://') ? url : 'https://' + url.replace(/^https?:\/\//i, '')
    open(secure)
  }

  async function handleAdd() {
    if (!form.title.trim() || !form.url.trim()) return
    const link = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      url: form.url.trim(),
      emoji: form.emoji || '🔗',
      group: form.group.trim(),
    }
    await addLink(link)
    setForm(emptyForm)
    setModalOpen(false)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
          Quick Links
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          + Add Link
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {links.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No links yet. Click "+ Add Link" to get started.
          </div>
        ) : grouped ? (
          Array.from(grouped.entries()).map(([groupName, groupLinks]) => (
            <div key={groupName} className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {groupName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {groupLinks.map(link => (
                  <LinkCard key={link.id} link={link} onRemove={removeLink} onOpen={handleOpen} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {links.map(link => (
              <LinkCard key={link.id} link={link} onRemove={removeLink} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Link">
        <div className="flex flex-col gap-3">
          <input
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            autoFocus
          />
          <input
            placeholder="URL (e.g. https://example.com)"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <input
            placeholder="Emoji (e.g. 📚)"
            value={form.emoji}
            onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            maxLength={2}
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {groupsEnabled && (
            <input
              placeholder="Group (e.g. University, Tools)"
              value={form.group}
              onChange={e => setForm(f => ({ ...f, group: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          )}
          <div className="flex gap-2 justify-end mt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--color-surface-alt)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              Add
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function LinkCard({ link, onRemove, onOpen }: { link: { id: string; title: string; url: string; emoji: string }; onRemove: (id: string) => void; onOpen: (url: string) => void }) {
  return (
    <div
      className="group relative rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      onClick={() => onOpen(link.url)}
    >
      <button
        onClick={e => { e.stopPropagation(); onRemove(link.id) }}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-(--color-surface-alt)"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="text-2xl mb-2">{link.emoji}</div>
      <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
        {link.title}
      </div>
      <div className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
        {link.url.replace(/^https?:\/\//, '')}
      </div>
    </div>
  )
}
