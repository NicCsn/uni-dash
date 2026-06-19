import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../lib/storage', () => ({
  readJson: vi.fn().mockResolvedValue(null),
  writeJson: vi.fn().mockResolvedValue(undefined),
  setAuthState: vi.fn(),
  ensureDir: vi.fn().mockResolvedValue('/mock/dir'),
}))

import { useStats } from './useStats'

describe('useStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with zero stats', () => {
    const { result } = renderHook(() => useStats())
    expect(result.current.todosCompletedToday).toBe(0)
    expect(result.current.pomodoroSessionsToday).toBe(0)
    expect(result.current.focusMinutesToday).toBe(0)
  })

  it('logTodoCompleted increments todo count', async () => {
    const { result } = renderHook(() => useStats())
    await act(async () => { await result.current.logTodoCompleted() })
    expect(result.current.todosCompletedToday).toBe(1)
  })

  it('multiple logTodoCompleted adds up', async () => {
    const { result } = renderHook(() => useStats())
    await act(async () => { await result.current.logTodoCompleted() })
    await act(async () => { await result.current.logTodoCompleted() })
    await act(async () => { await result.current.logTodoCompleted() })
    expect(result.current.todosCompletedToday).toBe(3)
  })

  it('logPomodoroSession tracks sessions and minutes', async () => {
    const { result } = renderHook(() => useStats())
    await act(async () => { await result.current.logPomodoroSession(25) })
    expect(result.current.pomodoroSessionsToday).toBe(1)
    expect(result.current.focusMinutesToday).toBe(25)
  })

  it('multiple pomodoro sessions accumulate minutes', async () => {
    const { result } = renderHook(() => useStats())
    await act(async () => { await result.current.logPomodoroSession(25) })
    await act(async () => { await result.current.logPomodoroSession(15) })
    expect(result.current.pomodoroSessionsToday).toBe(2)
    expect(result.current.focusMinutesToday).toBe(40)
  })
})
