// Tasks tab: family task lists (collapsible, drag-to-reorder) plus the
// kids' task stacks. One-time items live here; weekly repeats are Chores.

import { useMemo, useRef, useState } from 'react'
import { Plus, X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { useTodos } from '../../state/TodosContext.jsx'
import { useTodoLists, normalizedTodoListId, DEFAULT_TODO_LIST_ID } from '../../state/TodoListsContext.jsx'
import {
  KID_STACK_ASSIGNEES, KID_STACK_EMOJI, KID_STACK_LABEL,
  isKidStackAssignee, normalizeMemberName,
} from '../../lib/family.js'
import AssigneeSelect from './AssigneeSelect.jsx'
import TaskRow from './TaskRow.jsx'
import {
  loadCollapsedLists, saveCollapsedLists, loadTodoView, saveTodoView,
  loadLastAssignee, saveLastAssignee,
} from './plannerUtils.js'

// Kid stacks share the collapse-state store with real lists via this prefix.
function kidStackCollapseKey(name) {
  return `__kid:${name}`
}

export default function TasksTab({ onEditTodo, onNewList, showNotice }) {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos()
  const { lists, deleteList, reorder } = useTodoLists()

  const [filter, setFilter] = useState('active') // 'active' | 'done'
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [view, setViewState] = useState(loadTodoView)
  const [collapsed, setCollapsed] = useState(loadCollapsedLists)
  const [quickText, setQuickText] = useState('')
  const [quickDue, setQuickDue] = useState('')
  const [quickAssignee, setQuickAssignee] = useState(loadLastAssignee)
  const [confirmingListId, setConfirmingListId] = useState(null)
  const draggingId = useRef(null)
  const [dropTargetId, setDropTargetId] = useState(null)

  function setView(v) {
    setViewState(v)
    saveTodoView(v)
  }

  function toggleCollapsed(id) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveCollapsedLists(next)
      return next
    })
  }

  const visible = useMemo(
    () =>
      todos
        .filter((t) => {
          if (filter === 'active' && t.done) return false
          if (filter === 'done' && !t.done) return false
          if (assigneeFilter && t.assignee !== assigneeFilter) return false
          return true
        })
        .map((t) => ({ ...t, listId: normalizedTodoListId(t.listId) })),
    [todos, filter, assigneeFilter],
  )

  const parentTodos = useMemo(() => visible.filter((t) => !isKidStackAssignee(t.assignee)), [visible])

  function sortedForList(listId) {
    return parentTodos
      .filter((t) => t.listId === listId)
      .sort((a, b) => {
        if (!a.done && !b.done) {
          const ad = a.dueDate || '9999'
          const bd = b.dueDate || '9999'
          if (ad !== bd) return ad < bd ? -1 : 1
        }
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      })
  }

  function kidStackTodos(name) {
    return visible
      .filter((t) => normalizeMemberName(t.assignee) === name)
      .sort((a, b) => {
        if (!a.done && !b.done) {
          const ad = a.dueDate || '9999'
          const bd = b.dueDate || '9999'
          if (ad !== bd) return ad < bd ? -1 : 1
        }
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      })
  }

  const activeCount = visible.filter((t) => !t.done).length
  const datedCount = visible.filter((t) => !!t.dueDate).length
  const kidCount = visible.filter((t) => isKidStackAssignee(t.assignee)).length

  async function quickAdd() {
    const text = quickText.trim()
    if (!text) return
    const assignee = normalizeMemberName(quickAssignee)
    try {
      await addTodo({
        listId: DEFAULT_TODO_LIST_ID,
        text,
        assignee,
        dueDate: quickDue || null,
      })
      if (assignee) {
        saveLastAssignee(assignee)
        setQuickAssignee(assignee)
      }
      setQuickText('')
      setQuickDue('')
      showNotice('Task added.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't add that task.", 'error')
    }
  }

  async function handleToggle(id, done) {
    try {
      await toggleTodo(id, done)
    } catch (e) {
      console.error(e)
      showNotice("Couldn't update that task.", 'error')
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTodo(id)
      showNotice('Task deleted.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that task.", 'error')
    }
  }

  async function handleDeleteList(id) {
    setConfirmingListId(null)
    const impacted = todos
      .filter((t) => normalizedTodoListId(t.listId) === id)
      .map((t) => t.id)
    try {
      await deleteList(id, impacted)
      showNotice('List removed. Tasks moved to General.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that list.", 'error')
    }
  }

  async function handleDrop(targetId) {
    const sourceId = draggingId.current
    draggingId.current = null
    setDropTargetId(null)
    if (!sourceId || sourceId === targetId) return
    const orderedIds = lists.map((l) => l.id)
    const from = orderedIds.indexOf(sourceId)
    const to = orderedIds.indexOf(targetId)
    if (from < 0 || to < 0 || from === to) return
    orderedIds.splice(to, 0, orderedIds.splice(from, 1)[0])
    try {
      await reorder(orderedIds)
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save the new list order.", 'error')
    }
  }

  const showFamily = view !== 'kids'
  const showKids = view !== 'family'

  return (
    <div className="tasks-tab">
      <div className="card planner-explainer">
        <div>
          <div className="planner-explainer-title">Tasks are for one-time things.</div>
          <p className="planner-explainer-copy">
            Use tasks for errands, reminders, and project items. If something repeats every week,
            keep it in Chores instead.
          </p>
        </div>
      </div>

      <div className="quick-add-row">
        <input
          className="field"
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') quickAdd()
          }}
          placeholder="Add a task…"
          aria-label="New task"
        />
        <AssigneeSelect value={quickAssignee} onChange={setQuickAssignee} ariaLabel="Assignee" />
        <input
          type="date"
          className="field date-field"
          value={quickDue}
          onChange={(e) => setQuickDue(e.target.value)}
          title="Show on date (optional)"
          aria-label="Show on date"
        />
        <button className="btn btn-primary" onClick={quickAdd}>
          <Plus aria-hidden="true" size={16} /> Add
        </button>
      </div>

      <div className="planner-toolbar">
        <button className="btn btn-sm" onClick={() => onEditTodo(null)}>
          <Plus aria-hidden="true" size={15} /> Task
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onNewList}>
          <Plus aria-hidden="true" size={15} /> New list
        </button>
        <div className="view-toggle" role="group" aria-label="Task view">
          {[
            ['family', 'Family Lists'],
            ['kids', 'Kids'],
            ['all', 'Everything'],
          ].map(([v, label]) => (
            <button
              type="button"
              key={v}
              className="view-toggle-btn"
              data-active={view === v}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <AssigneeSelect
          value={assigneeFilter}
          onChange={(v) => setAssigneeFilter(normalizeMemberName(v))}
          filterMode
          ariaLabel="Filter by assignee"
        />
      </div>

      <div className="summary-pills">
        <span className="summary-pill">
          <strong>{activeCount}</strong> {activeCount === 1 ? 'active task' : 'active tasks'}
        </span>
        <span className="summary-pill">
          <strong>{datedCount}</strong> scheduled
        </span>
        <span className="summary-pill">
          <strong>{kidCount}</strong> for kids
        </span>
        <span className="summary-pill muted">
          {assigneeFilter ? `Filtered to ${assigneeFilter}` : 'All assignees'}
        </span>
      </div>

      <div className="filter-chips">
        <button type="button" className="chip" data-active={filter === 'active'} onClick={() => setFilter('active')}>
          Active
        </button>
        <button type="button" className="chip" data-active={filter === 'done'} onClick={() => setFilter('done')}>
          Done
        </button>
      </div>

      {showFamily && (
        <>
          <div className="planner-section-label">Family Task Lists</div>
          <div className="todo-board">
            {lists.map((list) => {
              const isCollapsed = collapsed.has(list.id)
              const tasks = sortedForList(list.id)
              const activeTasks = tasks.filter((t) => !t.done).length
              const badge =
                isCollapsed && activeTasks > 0
                  ? `${activeTasks} active`
                  : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`
              return (
                <div
                  className="card todo-list-card"
                  key={list.id}
                  draggable
                  data-dragging={draggingId.current === list.id}
                  data-drop-target={dropTargetId === list.id}
                  onDragStart={(e) => {
                    draggingId.current = list.id
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', list.id)
                  }}
                  onDragEnd={() => {
                    draggingId.current = null
                    setDropTargetId(null)
                  }}
                  onDragOver={(e) => {
                    if (!draggingId.current || draggingId.current === list.id) return
                    e.preventDefault()
                    setDropTargetId(list.id)
                  }}
                  onDragLeave={() => setDropTargetId((cur) => (cur === list.id ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleDrop(list.id)
                  }}
                >
                  <div className="todo-list-head">
                    <button
                      type="button"
                      className="todo-list-summary"
                      onClick={() => toggleCollapsed(list.id)}
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? (
                        <ChevronRight aria-hidden="true" size={17} />
                      ) : (
                        <ChevronDown aria-hidden="true" size={17} />
                      )}
                      <span className="todo-list-name">{list.name || 'General'}</span>
                      <span className="todo-list-count">{badge}</span>
                    </button>
                    <span className="todo-list-drag" title="Drag to reorder" aria-hidden="true">
                      <GripVertical size={16} />
                    </span>
                    {list.id !== DEFAULT_TODO_LIST_ID &&
                      (confirmingListId === list.id ? (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteList(list.id)}
                          onBlur={() => setConfirmingListId(null)}
                        >
                          Delete list?
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setConfirmingListId(list.id)}
                          title="Delete list"
                          aria-label={`Delete list ${list.name || ''}`}
                        >
                          <X aria-hidden="true" size={15} />
                        </button>
                      ))}
                  </div>
                  {!isCollapsed && (
                    <div className="todo-list-body">
                      {tasks.length ? (
                        tasks.map((t) => (
                          <TaskRow
                            key={t.id}
                            todo={t}
                            onToggle={handleToggle}
                            onEdit={onEditTodo}
                            onDelete={handleDelete}
                          />
                        ))
                      ) : (
                        <div className="planner-empty">
                          {filter === 'done' ? 'No completed tasks here.' : 'No active tasks in this list.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {showKids && (
        <>
          <div className="planner-section-label">Kids&rsquo; Tasks</div>
          <div className="kid-stack-grid">
            {KID_STACK_ASSIGNEES.map((name) => {
              const stackKey = kidStackCollapseKey(name)
              const isCollapsed = collapsed.has(stackKey)
              const tasks = kidStackTodos(name)
              const activeTasks = tasks.filter((t) => !t.done).length
              const badge =
                isCollapsed && activeTasks > 0
                  ? `${activeTasks} active`
                  : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`
              return (
                <div className="card kid-stack-card" key={name}>
                  <button
                    type="button"
                    className="todo-list-summary"
                    onClick={() => toggleCollapsed(stackKey)}
                    aria-expanded={!isCollapsed}
                  >
                    <span className="kid-stack-emoji" aria-hidden="true">
                      {KID_STACK_EMOJI[name] || '🧒'}
                    </span>
                    <span className="todo-list-name">{KID_STACK_LABEL[name] || name}</span>
                    <span className="todo-list-count">{badge}</span>
                    {isCollapsed ? (
                      <ChevronRight aria-hidden="true" size={17} />
                    ) : (
                      <ChevronDown aria-hidden="true" size={17} />
                    )}
                  </button>
                  {!isCollapsed && (
                    <div className="todo-list-body">
                      {tasks.length ? (
                        tasks.map((t) => (
                          <TaskRow
                            key={t.id}
                            todo={t}
                            onToggle={handleToggle}
                            onEdit={onEditTodo}
                            onDelete={handleDelete}
                          />
                        ))
                      ) : (
                        <div className="planner-empty">
                          {filter === 'done' ? 'Nothing completed yet.' : 'No active tasks.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
