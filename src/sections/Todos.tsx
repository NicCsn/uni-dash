import { useState, useMemo, useRef, useEffect } from 'react'
import type { Priority } from '../types'
import { useTodos } from '../hooks/useTodos'
import { useStats } from '../hooks/useStats'
import Modal from '../components/Modal'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'low', label: 'Low', color: '#22c55e' },
]

export default function Todos() {
  const { todos, addTodo, toggleTodo, removeTodo, editTodo, reorderTodos, batchComplete, batchDelete } = useTodos()
  const { logTodoCompleted } = useStats()

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

  // Pointer-event drag & drop
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [visualDropTarget, setVisualDropTarget] = useState<string | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const dropTargetRef = useRef<string | null>(null)

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Available tags
  const allTags = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('todo_tags') || '[]') as { name: string; color: string }[] }
    catch { return [] }
  }, [])

  // Edit tags state
  const [editTags, setEditTags] = useState<string[]>([])

  useEffect(() => {
    if (!dragId) return
    dragIdRef.current = dragId

    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const item = el?.closest('[data-todo-id]') as HTMLElement | null
      const id = item?.getAttribute('data-todo-id')
      const target = id && id !== dragId ? id : null
      dropTargetRef.current = target
      setVisualDropTarget(target)
    }

    const onUp = () => {
      if (dropTargetRef.current && dragIdRef.current) {
        reorderTodos(dragIdRef.current, dropTargetRef.current)
      }
      dragIdRef.current = null
      dropTargetRef.current = null
      setDragId(null)
      setVisualDropTarget(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragId, reorderTodos])

  const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

  const sorted = useMemo(
    () =>
      [...todos].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        const pa = PRIORITY_RANK[a.priority] ?? 1
        const pb = PRIORITY_RANK[b.priority] ?? 1
        if (pa !== pb) return pa - pb
        return (a.order ?? 0) - (b.order ?? 0)
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
    setEditTags(todo.tags || [])
  }

  async function handleEdit() {
    if (!editingId || !editTitle.trim()) return
    await editTodo(editingId, {
      title: editTitle.trim(),
      dueDate: editDue || null,
      priority: editPriority,
      course: editCourse.trim(),
      tags: editTags,
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

      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {selectedIds.size} selected
          </span>
          <button
            onClick={async () => {
              await batchComplete(selectedIds)
              logTodoCompleted()
              setSelectedIds(new Set())
            }}
            className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-85 active:scale-95"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            Complete
          </button>
          <button
            onClick={async () => {
              await batchDelete(selectedIds)
              setSelectedIds(new Set())
            }}
            className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-85 active:scale-95"
            style={{ background: '#ef4444', color: '#fff' }}
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-85 active:scale-95"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {sorted.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No todos yet. Click "+ Add Todo" to get started.
          </div>
        ) : (
          <div ref={containerRef} className="max-w-2xl mx-auto flex flex-col gap-1">
            {sorted.map(todo => (
              <div
                key={todo.id}
                data-todo-id={todo.id}
                onPointerDown={e => {
                  if (todo.completed) return
                  const target = e.target as HTMLElement
                  if (target.closest('button')) return
                  setDragId(todo.id)
                }}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl select-none"
                style={{
                  color: 'var(--color-text)',
                  opacity: dragId === todo.id ? 0.4 : 1,
                  cursor: todo.completed ? 'default' : dragId === todo.id ? 'grabbing' : 'grab',
                  background: visualDropTarget === todo.id ? 'var(--color-surface)' : 'transparent',
                  borderTop: visualDropTarget === todo.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                  transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(todo.id)}
                  onChange={e => {
                    const next = new Set(selectedIds)
                    if (e.target.checked) next.add(todo.id)
                    else next.delete(todo.id)
                    setSelectedIds(next)
                  }}
                  className="shrink-0 w-4 h-4 rounded cursor-pointer accent-(--color-accent)"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <button
                  onClick={async () => {
                    const wasCompleted = todo.completed
                    await toggleTodo(todo.id)
                    if (!wasCompleted) logTodoCompleted()
                  }}
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
                    {(todo.tags?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {todo.tags.map(tagName => {
                          const t = allTags.find(t => t.name === tagName)
                          return t ? (
                            <span
                              key={t.name}
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: t.color + '22', color: t.color }}
                            >
                              {t.name}
                            </span>
                          ) : null
                        })}
                      </div>
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

          {allTags.length > 0 && (
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Tags
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {allTags.map(tag => {
                  const active = editTags.includes(tag.name)
                  return (
                    <button
                      key={tag.name}
                      onClick={() => {
                        setEditTags(prev =>
                          active ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                        )
                      }}
                      className="text-xs px-2 py-1 rounded-full font-medium transition-all active:scale-95"
                      style={{
                        background: active ? tag.color + '44' : 'var(--color-surface-alt)',
                        color: active ? tag.color : 'var(--color-text-secondary)',
                        outline: active ? `1.5px solid ${tag.color}` : 'none',
                      }}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
