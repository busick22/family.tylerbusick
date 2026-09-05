import { DAYS } from './family.js'

export function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(value + 'T12:00:00')
  return Number.isFinite(date.getTime()) && dateKey(date) === value
}
export function shiftDate(key, days) {
  const date = new Date(key + 'T12:00:00')
  date.setDate(date.getDate() + days)
  return dateKey(date)
}
export function weekDates(key) {
  const start = shiftDate(key, -new Date(key + 'T12:00:00').getDay())
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i))
}
export function dayLabel(key, options = { weekday: 'long', month: 'short', day: 'numeric' }) {
  return new Date(key + 'T12:00:00').toLocaleDateString('en-US', options)
}
export function workItems(todos, chores, today) {
  const week = weekDates(today)
  return [
    ...todos.map(item => ({ ...item, kind: 'task', title: item.text, date: item.dueDate || null })),
    ...chores.map(item => ({ ...item, kind: 'chore', title: item.name, date: week[DAYS.indexOf(item.day)] || null })),
  ]
}
// A weekly chore is pinned to its weekday, so an unchecked Monday chore looks
// "late" from Tuesday onward every single week. Calling that Overdue alongside
// genuinely missed one-time tasks trains everyone to ignore the group, so
// repeating work gets its own gentler heading.
export function workGroup(item, today) {
  if (item.done) return 'Completed'
  if (!item.date) return 'Anytime'
  if (item.date < today) return item.kind === 'chore' ? 'Earlier this week' : 'Overdue'
  if (item.date === today) return 'Today'
  return 'Upcoming'
}
