export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type Priority = 'high' | 'medium' | 'low'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  color: string
  recurrence: Recurrence
}

export interface TodoItem {
  id: string
  title: string
  completed: boolean
  createdAt: string
  dueDate: string | null
  priority: Priority
  course: string
}

export interface QuickLink {
  id: string
  title: string
  url: string
  emoji: string
}

export interface DocEntry {
  name: string
  path: string
  isDir: boolean
  size: number
  mtime: Date | null
}

export interface LabelEntry {
  path: string
  color: string
}
