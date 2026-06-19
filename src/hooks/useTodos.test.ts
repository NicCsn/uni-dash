import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock storage
vi.mock('../lib/storage', () => ({
  readJson: vi.fn().mockResolvedValue(null),
  writeJson: vi.fn().mockResolvedValue(undefined),
  setAuthState: vi.fn(),
  ensureDir: vi.fn().mockResolvedValue('/mock/dir'),
}))

import { useTodos } from './useTodos'

describe('useTodos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with empty todos', () => {
    const { result } = renderHook(() => useTodos())
    expect(result.current.todos).toEqual([])
  })

  it('addTodo creates a new todo', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => {
      await result.current.addTodo('Buy milk', '2026-01-15', 'high', 'Shopping')
    })
    expect(result.current.todos.length).toBe(1)
    const todo = result.current.todos[0]
    expect(todo.title).toBe('Buy milk')
    expect(todo.priority).toBe('high')
    expect(todo.course).toBe('Shopping')
    expect(todo.dueDate).toBe('2026-01-15')
    expect(todo.completed).toBe(false)
    expect(todo.tags).toEqual([])
    expect(todo.order).toBe(0)
  })

  it('toggleTodo toggles completion', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => {
      await result.current.addTodo('Test')
    })
    const id = result.current.todos[0].id
    expect(result.current.todos[0].completed).toBe(false)
    await act(async () => {
      await result.current.toggleTodo(id)
    })
    expect(result.current.todos[0].completed).toBe(true)
    await act(async () => {
      await result.current.toggleTodo(id)
    })
    expect(result.current.todos[0].completed).toBe(false)
  })

  it('removeTodo deletes a todo', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => {
      await result.current.addTodo('Test')
    })
    expect(result.current.todos.length).toBe(1)
    await act(async () => {
      await result.current.removeTodo(result.current.todos[0].id)
    })
    expect(result.current.todos.length).toBe(0)
  })

  it('editTodo updates fields', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => {
      await result.current.addTodo('Old Title')
    })
    const id = result.current.todos[0].id
    await act(async () => {
      await result.current.editTodo(id, { title: 'New Title', priority: 'low', tags: ['tag1'] })
    })
    expect(result.current.todos[0].title).toBe('New Title')
    expect(result.current.todos[0].priority).toBe('low')
  })

  it('addTodo assigns auto-incrementing order', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => { await result.current.addTodo('A') })
    await act(async () => { await result.current.addTodo('B') })
    await act(async () => { await result.current.addTodo('C') })
    expect(result.current.todos[0].order).toBe(0)
    expect(result.current.todos[1].order).toBe(1)
    expect(result.current.todos[2].order).toBe(2)
  })

  it('reorderTodos preserves todo count', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => { await result.current.addTodo('A') })
    await act(async () => { await result.current.addTodo('B') })

    expect(result.current.todos.length).toBe(2)
  })

  it('batchComplete completes multiple todos', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => { await result.current.addTodo('A') })
    await act(async () => { await result.current.addTodo('B') })
    await act(async () => { await result.current.addTodo('C') })

    const ids = new Set(result.current.todos.map(t => t.id))
    await act(async () => {
      await result.current.batchComplete(ids)
    })

    for (const t of result.current.todos) {
      expect(t.completed).toBe(true)
    }
  })

  it('batchDelete removes multiple todos', async () => {
    const { result } = renderHook(() => useTodos())
    await act(async () => { await result.current.addTodo('A') })
    await act(async () => { await result.current.addTodo('B') })

    const ids = new Set([result.current.todos[0].id])
    await act(async () => {
      await result.current.batchDelete(ids)
    })

    expect(result.current.todos.length).toBe(1)
    expect(result.current.todos[0].title).toBe('B')
  })
})
