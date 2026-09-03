// Pure helpers for the Kids page — task/chore visibility, sorting, and the
// "pending done" undo window. Ported 1:1 from the old kids.js so behavior
// (and the Firestore fields it reads/writes) stays identical.

import { DAYS, todayStr } from '../../lib/family.js'

const TASK_COMPLETE_DELAY_MS = 60 * 60 * 1000 // 1hr undo window after checking a task off

export function taskCompleteDelayMs() {
  return TASK_COMPLETE_DELAY_MS
}

function pendingDoneMs(task) {
  if (!task?.pendingDoneUntil) return null
  if (typeof task.pendingDoneUntil === 'number') return task.pendingDoneUntil
  if (typeof task.pendingDoneUntil === 'string') {
    const ms = Date.parse(task.pendingDoneUntil)
    return Number.isNaN(ms) ? null : ms
  }
  if (typeof task.pendingDoneUntil === 'object' && typeof task.pendingDoneUntil.seconds === 'number') {
    return task.pendingDoneUntil.seconds * 1000
  }
  return null
}

function isTaskInUndoWindow(task) {
  const ms = pendingDoneMs(task)
  return !!ms && ms > Date.now()
}

export function isTaskChecked(task) {
  return !!task?.done || (!task?.done && isTaskInUndoWindow(task))
}

export function isTaskVisible(task) {
  return !task?.done || isTaskInUndoWindow(task)
}

export function taskShowsOn(task, date = todayStr()) {
  return !task?.dueDate || task.dueDate <= date
}

export function isOverdueChore(chore, todayIndex = new Date().getDay()) {
  const idx = DAYS.indexOf(chore?.day)
  return idx >= 0 && idx < todayIndex && !chore?.done
}

export function taskShowLabel(dateStr) {
  if (!dateStr) return ''
  const dt = new Date(`${dateStr}T12:00`)
  if (dateStr < todayStr()) return `Overdue from ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  if (dateStr === todayStr()) return 'Shows today'
  return `Shows ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function assignedTasksFor(todos, kidName) {
  return todos.filter((t) => t.assignee === kidName && isTaskVisible(t) && taskShowsOn(t))
}

export function assignedOpenTasksFor(todos, kidName) {
  return todos.filter((t) => t.assignee === kidName && !isTaskChecked(t) && taskShowsOn(t))
}

export function everyoneTasks(todos) {
  return todos.filter((t) => t.assignee === 'Kids' && isTaskVisible(t) && (!t.dueDate || taskShowsOn(t)))
}

export function openEveryoneTasks(todos) {
  return todos.filter((t) => t.assignee === 'Kids' && !isTaskChecked(t) && (!t.dueDate || taskShowsOn(t)))
}

export function sortKidTasks(taskList) {
  return [...taskList].sort((a, b) => {
    const aChecked = isTaskChecked(a)
    const bChecked = isTaskChecked(b)
    if (aChecked !== bChecked) return aChecked ? 1 : -1
    const ad = a.dueDate || '9999-12-31'
    const bd = b.dueDate || '9999-12-31'
    if (ad !== bd) return ad.localeCompare(bd)
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  })
}

// Every pending item a parent needs to act on: reward redemption requests
// and screen-time "more please" requests, merged into one list.
export function pendingItems(kidPoints, screenTimeRequests) {
  const items = []
  Object.entries(kidPoints).forEach(([kidName, data]) => {
    ;(data.pendingRedemptions || []).forEach((r, idx) =>
      items.push({ kind: 'redeem', kidName, idx, name: r.name, cost: r.cost }),
    )
  })
  screenTimeRequests.forEach((r) =>
    items.push({ kind: 'time', id: r.id, kidName: r.kidName, requestedMs: r.requestedMs, createdAt: r.createdAt }),
  )
  return items
}

export function kidBalance(kidPoints, kidName) {
  const data = kidPoints[kidName]
  if (!data) return 0
  const earned = (data.history || []).reduce((s, e) => s + (e.points || 0), 0)
  const redeemed = (data.redeemed || []).reduce((s, e) => s + (e.cost || 0), 0)
  return Math.max(0, earned - redeemed)
}
