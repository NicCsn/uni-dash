import { useEffect, useRef } from 'react'

const LABEL_COLORS = [
  { color: '#ef4444', label: 'Red' },
  { color: '#f97316', label: 'Orange' },
  { color: '#eab308', label: 'Yellow' },
  { color: '#22c55e', label: 'Green' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#a855f7', label: 'Purple' },
]

interface Props {
  x: number
  y: number
  currentColor: string
  onSelect: (color: string) => void
  onRemove: () => void
  onClose: () => void
}

export default function ContextMenu({ x, y, currentColor, onSelect, onRemove, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl p-2 shadow-lg border"
      style={{
        left: x,
        top: y,
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="text-xs font-medium px-2 py-1" style={{ color: 'var(--color-text-secondary)' }}>
        Color Label
      </div>
      <div className="flex flex-col gap-1 mt-1 min-w-36">
        {LABEL_COLORS.map(c => (
          <button
            key={c.color}
            onClick={() => {
              onSelect(c.color)
              onClose()
            }}
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-(--color-surface-alt)"
            style={{ color: 'var(--color-text)' }}
          >
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{ background: c.color }}
            />
            {c.label}
            {currentColor === c.color && <span className="ml-auto">✓</span>}
          </button>
        ))}
        <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />
        <button
          onClick={() => {
            onRemove()
            onClose()
          }}
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-(--color-surface-alt)"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Remove Label
        </button>
      </div>
    </div>
  )
}
