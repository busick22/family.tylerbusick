// Edit one of a kid's own chores — name + day. Chores are created by a
// parent (Planner), so there's no "add" path here, only edit/delete.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { DAYS } from '../../lib/family.js'
import { useNotice } from '../../state/NoticeContext.jsx'

export default function KidChoreModal({ chore, onClose, onSave, onDelete }) {
  const showNotice = useNotice()
  const [name, setName] = useState(chore.name || '')
  const [day, setDay] = useState(chore.day || DAYS[0])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      showNotice('Add a chore name first.', 'error')
      return
    }
    setBusy(true)
    try {
      await onSave(trimmed, day)
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't update that chore.", 'error')
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
      showNotice("Couldn't delete that chore.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(400px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>Edit Chore</h3>

      <label className="field-label" htmlFor="kid-chore-name">
        Chore
      </label>
      <input
        id="kid-chore-name"
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="What needs to get done?"
        autoFocus
      />

      <label className="field-label" htmlFor="kid-chore-day">
        Day
      </label>
      <select
        id="kid-chore-day"
        className="field select-field"
        value={day}
        onChange={(e) => setDay(e.target.value)}
      >
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <div className="modal-actions">
        <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
          {confirmingDelete ? 'Really delete?' : 'Delete'}
        </button>
        <span className="modal-actions-gap" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          Save Chore
        </button>
      </div>
    </Modal>
  )
}
