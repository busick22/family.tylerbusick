// Today tab: today's events + a merged checklist of due tasks and chores.

import { useMemo, useState } from 'react'
import { X, MapPin, Plus } from 'lucide-react'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { useEvents } from '../../state/EventsContext.jsx'
import { useMembers } from '../../state/MembersContext.jsx'
import { useTodoLists, normalizedTodoListId } from '../../state/TodoListsContext.jsx'
import { DAYS, todayStr, formatTime } from '../../lib/family.js'
import { isOverdueChore, EVENT_COLORS } from './plannerUtils.js'

export default function TodayTab({ onAddEvent, showNotice }) {
  const { todos, toggleTodo } = useTodos()
  const { chores, toggleChore } = useChores()
  const { events, deleteEvent } = useEvents()
  const { memberColor } = useMembers()
  const { listName } = useTodoLists()
  const [confirmingEventId, setConfirmingEventId] = useState(null)

  const today = todayStr()
  const todayIndex = new Date().getDay()
  const dayName = DAYS[todayIndex]

  const todayEvents = useMemo(
    () =>
      events
        .filter((e) => e.date === today)
        .sort((a, b) => {
          if (!a.time && !b.time) return 0
          if (!a.time) return 1
          if (!b.time) return -1
          return a.time.localeCompare(b.time)
        }),
    [events, today],
  )

  const items = useMemo(() => {
    const choresToday = chores.filter((c) => c.day === dayName || isOverdueChore(c, todayIndex))
    const openTasks = todos.filter((t) => !t.done && !!t.dueDate && t.dueDate <= today)
    const all = [
      ...choresToday.map((c) => ({
        kind: 'chore',
        id: c.id,
        label: c.name,
        assignee: c.assignee,
        done: c.done,
        isOverdue: isOverdueChore(c, todayIndex),
        sortKey: DAYS.indexOf(c.day),
      })),
      ...openTasks.map((t) => ({
        kind: 'task',
        id: t.id,
        label: t.text,
        assignee: t.assignee,
        done: t.done,
        dueDate: t.dueDate,
        listId: normalizedTodoListId(t.listId),
      })),
    ]
    all.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const aPri = a.kind === 'task' ? (a.dueDate < today ? -1 : 0) : a.isOverdue ? -1 : 0
      const bPri = b.kind === 'task' ? (b.dueDate < today ? -1 : 0) : b.isOverdue ? -1 : 0
      if (aPri !== bPri) return aPri - bPri
      if (a.kind === 'task' && b.kind === 'task' && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate)
      }
      if (a.kind === 'chore' && b.kind === 'chore' && a.sortKey !== b.sortKey) {
        return a.sortKey - b.sortKey
      }
      return a.label.localeCompare(b.label)
    })
    return all
  }, [todos, chores, dayName, todayIndex, today])

  async function handleCheck(item, done) {
    try {
      if (item.kind === 'task') await toggleTodo(item.id, done)
      else await toggleChore(item.id, done)
    } catch (e) {
      console.error(e)
      showNotice("Couldn't update that item.", 'error')
    }
  }

  async function removeEvent(id) {
    setConfirmingEventId(null)
    try {
      await deleteEvent(id)
      showNotice('Event removed.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't remove that event.", 'error')
    }
  }

  return (
    <div className="card planner-panel">
      <div className="planner-panel-head">
        <div className="panel-title">{dayName}&rsquo;s Focus</div>
        <button className="btn btn-sm" onClick={onAddEvent}>
          <Plus aria-hidden="true" size={15} /> Event
        </button>
      </div>

      {todayEvents.length > 0 && (
        <>
          <div className="planner-section-label">Today&rsquo;s Events</div>
          <div className="today-events">
            {todayEvents.map((ev) => (
              <div className="today-event-row" key={ev.id}>
                <span className="today-event-dot" style={{ background: ev.color || EVENT_COLORS[0] }} />
                <span className="today-event-time">{formatTime(ev.time)}</span>
                <div className="today-event-info">
                  <div className="today-event-title">{ev.title}</div>
                  {(ev.who || []).length > 0 && (
                    <div className="today-event-meta">{ev.who.join(', ')}</div>
                  )}
                  {ev.location && (
                    <div className="today-event-meta">
                      <MapPin aria-hidden="true" size={11} /> {ev.location}
                    </div>
                  )}
                </div>
                {confirmingEventId === ev.id ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeEvent(ev.id)}
                    onBlur={() => setConfirmingEventId(null)}
                  >
                    Remove?
                  </button>
                ) : (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setConfirmingEventId(ev.id)}
                    title="Remove event"
                    aria-label={`Remove event ${ev.title}`}
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {items.length ? (
        <>
          {todayEvents.length > 0 && <div className="planner-section-label">Tasks &amp; Chores</div>}
          <div className="today-checklist">
            {items.map((item) => (
              <div className="task-row" data-done={item.done} key={`${item.kind}-${item.id}`}>
                <input
                  type="checkbox"
                  className="task-check"
                  checked={!!item.done}
                  onChange={(e) => handleCheck(item, e.target.checked)}
                  aria-label={`Mark ${item.label} ${item.done ? 'incomplete' : 'complete'}`}
                />
                <span className="task-label">
                  {item.label}
                  <span className="task-meta">
                    {item.kind === 'chore'
                      ? `Chore${item.isOverdue ? ' · Overdue' : ''}`
                      : `Task · ${listName(item.listId)}${item.dueDate < today ? ' · Overdue' : ''}`}
                    {item.assignee ? ` · ${item.assignee}` : ''}
                  </span>
                </span>
                {item.assignee && (
                  <span className="assignee-badge" style={{ background: memberColor(item.assignee) }}>
                    {item.assignee}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="planner-empty">Nothing for today or overdue — enjoy the quiet! 🎉</p>
      )}
    </div>
  )
}
