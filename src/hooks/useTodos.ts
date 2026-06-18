import { useState, useEffect, useCallback } from 'react'
import type { TodoItem, Priority } from '../types'
import { readJson, writeJson } from '../lib/storage'

const FILE = 'todos.json'

function ensureOrder(todos: TodoItem[]): TodoItem[] {
  let hasMissing = false
  const next = todos.map((t, i) => {
    if (t.order === undefined || t.order === null) {
      hasMissing = true
      return { ...t, order: i }
    }
    return t
  })
  if (hasMissing) return next
  return todos
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([])

  useEffect(() => {
    readJson<TodoItem[]>(FILE).then(data => {
      if (data) setTodos(ensureOrder(data))
    })
  }, [])

  const persist = useCallback(async (next: TodoItem[]) => {
    setTodos(next)
    await writeJson(FILE, next)
  }, [])

  const addTodo = useCallback(
    async (title: string, dueDate: string | null = null, priority: Priority = 'medium', course: string = '') => {
      const todo: TodoItem = {
        id: crypto.randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate,
        priority,
        course,
        order: todos.length,
        tags: [],
      }
      await persist([...todos, todo])
      return todo
    },
    [todos, persist],
  )

  const toggleTodo = useCallback(
    async (id: string) => {
      await persist(
        todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
      )
    },
    [todos, persist],
  )

  const removeTodo = useCallback(
    async (id: string) => {
      await persist(todos.filter(t => t.id !== id))
    },
    [todos, persist],
  )

  const editTodo = useCallback(
    async (id: string, updates: Partial<Pick<TodoItem, 'title' | 'dueDate' | 'priority' | 'course' | 'tags'>>) => {
      await persist(todos.map(t => (t.id === id ? { ...t, ...updates } : t)))
    },
    [todos, persist],
  )

  const reorderTodos = useCallback(
    async (sourceId: string, targetId: string) => {
      const active = todos.filter(t => !t.completed)
      const sourceIdx = active.findIndex(t => t.id === sourceId)
      const targetIdx = active.findIndex(t => t.id === targetId)
      if (sourceIdx === -1 || targetIdx === -1) return
      const reordered = [...active]
      const [moved] = reordered.splice(sourceIdx, 1)
      reordered.splice(targetIdx, 0, moved)
      const updated = reordered.map((t, i) => ({ ...t, order: i }))
      const completed = todos.filter(t => t.completed).map((t, i) => ({ ...t, order: i + updated.length }))
      await persist([...updated, ...completed])
    },
    [todos, persist],
  )

  const batchComplete = useCallback(async (ids: Set<string>) => {
    const next = todos.map(t =>
      ids.has(t.id) && !t.completed ? { ...t, completed: true } : t,
    )
    await persist(next)
  }, [todos, persist])

  const batchDelete = useCallback(async (ids: Set<string>) => {
    const next = todos.filter(t => !ids.has(t.id))
    await persist(next)
  }, [todos, persist])

  return { todos, addTodo, toggleTodo, removeTodo, editTodo, reorderTodos, batchComplete, batchDelete }
}
