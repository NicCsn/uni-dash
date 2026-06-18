import { useState, useRef, useEffect } from 'react'

interface Props {
  pin: string
  onSuccess: () => void
}

export default function PinOverlay({ pin, onSuccess }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit() {
    if (value === pin) {
      setError(false)
      onSuccess()
    } else {
      setError(true)
      setValue('')
      setTimeout(() => setError(false), 1000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-xs w-full px-6">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>

        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Enter PIN
        </h1>

        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={e => { setValue(e.target.value); setError(false) }}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          maxLength={6}
          className="w-full px-4 py-3 text-lg text-center tracking-widest rounded-xl border outline-none transition-all"
          style={{
            background: 'var(--color-surface)',
            borderColor: error ? '#ef4444' : 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          autoFocus
        />

        <div className="flex gap-2 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
            <button
              key={n}
              onClick={() => {
                if (value.length < 6) {
                  const next = value + String(n)
                  setValue(next)
                  if (next.length === 6) {
                    if (next === pin) {
                      onSuccess()
                    } else {
                      setError(true)
                      setTimeout(() => { setValue(''); setError(false) }, 800)
                    }
                  }
                }
              }}
              className="flex-1 py-3 rounded-xl text-lg font-semibold transition-all active:scale-90"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setValue(''); setError(false) }}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-85"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
