// Small helpers shared by the planner tabs. localStorage keys match the old
// static app so the tablet's saved view/collapse state carries over.

import { DAYS, todayStr, normalizeMemberName } from '../../lib/family.js'

export const EVENT_COLORS = [
  '#2563eb', '#7c3aed', '#ea580c', '#16a34a', '#db2777', '#0891b2', '#d97706',
]

const TODO_COLLAPSE_KEY = 'busick-family.todo-collapsed'
const TODO_VIEW_KEY = 'busick-family.todo-view'
const LAST_ASSIGNEE_KEY = 'busick-family.last-assignee'

// "Shows today" / "Since Jul 3" / "Shows Jul 20" — when a task appears.
export function dateLabel(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const ts = todayStr()
  if (dateStr === ts) return 'Shows today'
  if (dateStr < ts) return `Since ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  return `Shows ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function dateClass(dateStr) {
  if (!dateStr) return ''
  const ts = todayStr()
  if (dateStr === ts) return 'due-today'
  if (dateStr < ts) return 'overdue'
  return ''
}

// A chore from earlier this week that never got checked off.
export function isOverdueChore(chore, todayIndex = new Date().getDay()) {
  const idx = DAYS.indexOf(chore?.day)
  return idx >= 0 && idx < todayIndex && !chore?.done
}

export function formatDoneMeta(item) {
  if (!item.done || !item.completedAt) return ''
  const d = item.completedAt.seconds ? new Date(item.completedAt.seconds * 1000) : new Date(item.completedAt)
  if (isNaN(d)) return ''
  const when = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Done ${when}${item.completedBy ? ` by ${item.completedBy}` : ''}`
}

export function loadCollapsedLists() {
  try {
    const stored = JSON.parse(localStorage.getItem(TODO_COLLAPSE_KEY) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

export function saveCollapsedLists(set) {
  try {
    localStorage.setItem(TODO_COLLAPSE_KEY, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

export function loadTodoView() {
  try {
    const value = localStorage.getItem(TODO_VIEW_KEY)
    return ['family', 'kids', 'all'].includes(value) ? value : 'family'
  } catch {
    return 'family'
  }
}

export function saveTodoView(view) {
  try {
    localStorage.setItem(TODO_VIEW_KEY, view)
  } catch {
    /* ignore */
  }
}

export function loadLastAssignee() {
  try {
    return localStorage.getItem(LAST_ASSIGNEE_KEY) || ''
  } catch {
    return ''
  }
}

export function saveLastAssignee(name) {
  try {
    localStorage.setItem(LAST_ASSIGNEE_KEY, normalizeMemberName(name) || '')
  } catch {
    /* ignore */
  }
}
