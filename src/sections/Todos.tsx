import { useState, useMemo } from 'react'
import type { Priority } from '../types'
import { useTodos } from '../hooks/useTodos'
import Modal from '../components/Modal'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'low', label: 'Low', color: '#22c55e' },
]

export default function Todos() {
  const { todos, addTodo, toggleTodo, removeTodo, editTodo } = useTodos()

  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newCourse, setNewCourse] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('medium')
  const [editCourse, setEditCourse] = useState('')

  const sorted = useMemo(
    () =>
      [...todos].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        const order = { high: 0, medium: 1, low: 2 }
        const pd = order[a.priority] - order[b.priority]
        if (pd !== 0) return pd
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [todos],
  )

  async function handleCreate() {
    if (!newTitle.trim()) return
    await addTodo(newTitle.trim(), newDue || null, newPriority, newCourse.trim())
    setNewTitle('')
    setNewDue('')
    setNewPriority('medium')
    setNewCourse('')
    setCreateOpen(false)
  }

  function openEdit(todo: (typeof todos)[0]) {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDue(todo.dueDate || '')
    setEditPriority(todo.priority)
    setEditCourse(todo.course)
  }

  async function handleEdit() {
    if (!editingId || !editTitle.trim()) return
    await editTodo(editingId, {
      title: editTitle.trim(),
      dueDate: editDue || null,
      priority: editPriority,
      course: editCourse.trim(),
    })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await removeTodo(id)
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
          Todo List
        </h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          + Add Todo
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {sorted.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No todos yet. Click "+ Add Todo" to get started.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col gap-1">
            {sorted.map(todo => (
              <div
                key={todo.id}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-(--color-surface)"
                style={{ color: 'var(--color-text)' }}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: todo.completed
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                    background: todo.completed ? 'var(--color-accent)' : 'transparent',
                  }}
                >
                  {todo.completed && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!todo.completed && (
                      <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        style={{
                          background: PRIORITIES.find(p => p.value === todo.priority)?.color,
                        }}
                      />
                    )}
                    <span
                      className="text-sm truncate"
                      style={{
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        color: todo.completed
                          ? 'var(--color-text-secondary)'
                          : 'var(--color-text)',
                      }}
                    >
                      {todo.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {todo.dueDate && (
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        due {todo.dueDate}
                      </span>
                    )}
                    {todo.course && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: 'var(--color-surface-alt)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {todo.course}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(todo)}
                    className="p-1.5 rounded-lg hover:bg-(--color-surface-alt)"
                    style={{ color: 'var(--color-text-secondary)' }}
                    title="Edit"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="p-1.5 rounded-lg hover:bg-(--color-surface-alt)"
                    style={{ color: 'var(--color-text-secondary)' }}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Todo">
        <div className="flex flex-col gap-3">
          <input
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            autoFocus
          />
          <input
            type="date"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />

          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Priority
            </label>
            <div className="flex gap-2 mt-1">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setNewPriority(p.value)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background:
                      newPriority === p.value ? p.color : 'var(--color-surface-alt)',
                    color: newPriority === p.value ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Course / Topic
            </label>
            <input
              placeholder="e.g. Mathematik, Physik, ..."
              value={newCourse}
              onChange={e => setNewCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none mt-1"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--color-surface-alt)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editingId} onClose={() => setEditingId(null)} title="Edit Todo">
        <div className="flex flex-col gap-3">
          <input
            placeholder="Title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEdit()}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            autoFocus
          />
          <input
            type="date"
            value={editDue}
            onChange={e => setEditDue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />

          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Priority
            </label>
            <div className="flex gap-2 mt-1">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setEditPriority(p.value)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background:
                      editPriority === p.value ? p.color : 'var(--color-surface-alt)',
                    color: editPriority === p.value ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Course / Topic
            </label>
            <input
              placeholder="e.g. Mathematik, Physik, ..."
              value={editCourse}
              onChange={e => setEditCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none mt-1"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => setEditingId(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--color-surface-alt)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
