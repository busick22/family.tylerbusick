// Add/edit one of a kid's own tasks — just text + "show on" date. Points
// are set by a parent from the Points admin panel, not here.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { todayStr } from '../../lib/family.js'
import { useNotice } from '../../state/NoticeContext.jsx'

export default function KidTaskModal({ task, onClose, onSave, onDelete }) {
  const showNotice = useNotice()
  const editing = Boolean(task?.id)
  const [text, setText] = useState(task?.text || '')
  const [dueDate, setDueDate] = useState(task?.dueDate || todayStr())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = text.trim()
    if (!trimmed) {
      showNotice('Add a task first.', 'error')
      return
    }
    setBusy(true)
    try {
      await onSave(trimmed, dueDate || null)
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save that task.", 'error')
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
      await onDelete()
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that task.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(400px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>{editing ? 'Edit Task' : 'Add Task'}</h3>

      <label className="field-label" htmlFor="kid-task-text">
        Task
      </label>
      <input
        id="kid-task-text"
        className="field"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to get done?"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />

      <label className="field-label" htmlFor="kid-task-due">
        Show On
      </label>
      <input
        id="kid-task-due"
        type="date"
        className="field"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

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
          {editing ? 'Save Changes' : 'Save Task'}
        </button>
      </div>
    </Modal>
  )
}
