import { useState, useEffect, useCallback } from 'react'
import type { TodoItem, Priority } from '../types'
import { readJson, writeJson } from '../lib/storage'

const FILE = 'todos.json'

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([])

  useEffect(() => {
    readJson<TodoItem[]>(FILE).then(data => {
      if (data) setTodos(data)
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
    async (id: string, updates: Partial<Pick<TodoItem, 'title' | 'dueDate' | 'priority' | 'course'>>) => {
      await persist(todos.map(t => (t.id === id ? { ...t, ...updates } : t)))
    },
    [todos, persist],
  )

  return { todos, addTodo, toggleTodo, removeTodo, editTodo }
}
