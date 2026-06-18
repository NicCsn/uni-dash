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
  order: number
  tags: string[]
}

export interface QuickLink {
  id: string
  title: string
  url: string
  emoji: string
  group: string
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

export interface PomodoroConfig {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsBeforeLongBreak: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  breakReminder: boolean
}

export interface NotificationConfig {
  enabled: boolean
  notifyTodos: boolean
  notifyEvents: boolean
}

export interface TodoTag {
  name: string
  color: string
}

export interface BackupConfig {
  enabled: boolean
  interval: 'daily' | 'weekly'
}

export interface StatsData {
  todoCompletions: Record<string, number>
  pomodoroSessions: Record<string, number>
  pomodoroFocusMinutes: Record<string, number>
}

export interface UserRecord {
  username: string
  salt: string
  passwordHash: string
  encryptedKey: string
  createdAt: string
}

export interface AuthConfig {
  enabled: boolean
  currentUser: string | null
  sessionToken: string | null
  keepLoggedIn: boolean
}
