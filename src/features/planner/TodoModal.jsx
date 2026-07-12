// Add/edit a task: text, list, assignee, show-on date, points.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useTodoLists, normalizedTodoListId } from '../../state/TodoListsContext.jsx'
import { normalizeMemberName } from '../../lib/family.js'
import AssigneeSelect from './AssigneeSelect.jsx'
import { loadLastAssignee, saveLastAssignee } from './plannerUtils.js'

export default function TodoModal({ todo, onClose, showNotice }) {
  const { addTodo, updateTodo, deleteTodo } = useTodos()
  const { lists } = useTodoLists()
  const editing = Boolean(todo?.id)

  const [text, setText] = useState(todo?.text || '')
  const [listId, setListId] = useState(normalizedTodoListId(todo?.listId))
  const [assignee, setAssignee] = useState(editing ? todo?.assignee || '' : loadLastAssignee())
  const [dueDate, setDueDate] = useState(todo?.dueDate || '')
  const [points, setPoints] = useState(todo?.points ?? 0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = text.trim()
    if (!trimmed) {
      showNotice('Please add a task name.', 'error')
      return
    }
    const data = {
      text: trimmed,
      listId: normalizedTodoListId(listId),
      assignee: normalizeMemberName(assignee),
      dueDate: dueDate || null,
      points: Math.max(0, parseInt(points, 10) || 0),
    }
    setBusy(true)
    try {
      if (editing) await updateTodo(todo.id, data)
      else {
        await addTodo(data)
        saveLastAssignee(data.assignee)
      }
      showNotice(editing ? 'Task updated.' : 'Task added.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice(editing ? "Couldn't update that task." : "Couldn't add that task.", 'error')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setBusy(true)
    try {
      await deleteTodo(todo.id)
      showNotice('Task deleted.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that task.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(460px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>{editing ? 'Edit Task' : 'Add Task'}</h3>

      <label className="field-label" htmlFor="todo-text">Task *</label>
      <input
        id="todo-text"
        className="field"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Sign the field trip form"
        autoFocus
      />

      <div className="form-2col">
        <div>
          <label className="field-label" htmlFor="todo-list">List</label>
          <select
            id="todo-list"
            className="field select-field"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name || 'General'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="todo-assignee-m">Assignee</label>
          <AssigneeSelect id="todo-assignee-m" value={assignee} onChange={setAssignee} />
        </div>
      </div>

      <div className="form-2col">
        <div>
          <label className="field-label" htmlFor="todo-due-m">Show on date</label>
          <input
            id="todo-due-m"
            type="date"
            className="field"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="todo-points">Points (kids)</label>
          <input
            id="todo-points"
            type="number"
            min="0"
            className="field"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>
      </div>

      <div className="modal-actions">
        {editing && (
          <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
            {confirmingDelete ? 'Really delete?' : 'Delete'}
          </button>
        )}
        <span className="modal-actions-gap" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {editing ? 'Save changes' : 'Save task'}
        </button>
      </div>
    </Modal>
  )
}
