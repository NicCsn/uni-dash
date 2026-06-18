import { useState } from 'react'

interface Props {
  users: { username: string }[]
  onLogin: (username: string) => void
  onRegister: (username: string, password: string) => Promise<string | null>
  onSignIn: (username: string, password: string) => Promise<string | null>
}

export default function LoginScreen({ users, onLogin, onRegister, onSignIn }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>(users.length === 0 ? 'register' : 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!username.trim() || !password) { setError('Fill in all fields'); return }

    if (tab === 'register') {
      if (password.length < 4) { setError('Password must be at least 4 characters'); return }
      if (password !== confirm) { setError('Passwords do not match'); return }
      if (users.some(u => u.username === username.trim())) { setError('Username already taken'); return }
      setBusy(true)
      const err = await onRegister(username.trim(), password)
      setBusy(false)
      if (err === null) onLogin(username.trim())
      else setError(err)
    } else {
      setBusy(true)
      const err = await onSignIn(username.trim(), password)
      setBusy(false)
      if (err === null) {
        onLogin(username.trim())
      } else {
        setError(err)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border shadow-lg overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-3 text-sm font-medium transition-all duration-150 hover:opacity-85 active:scale-95 ${tab === t ? '' : 'opacity-50'}`}
              style={{
                color: tab === t ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              {t === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <div className="p-6 flex flex-col gap-4">
          {users.length === 0 && (
            <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
              Create your first account to get started
            </p>
          )}

          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            autoFocus
            disabled={busy}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            disabled={busy}
          />

          {tab === 'register' && (
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
              disabled={busy}
            />
          )}

          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            {busy ? 'Please wait…' : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
