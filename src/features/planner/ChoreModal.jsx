// Add/edit a chore: name, assignee, day of week, points.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { DAYS, normalizeMemberName } from '../../lib/family.js'
import AssigneeSelect from './AssigneeSelect.jsx'

export default function ChoreModal({ chore, onClose, showNotice }) {
  const { addChore, updateChore, deleteChore } = useChores()
  const editing = Boolean(chore?.id)

  const [name, setName] = useState(chore?.name || '')
  const [assignee, setAssignee] = useState(normalizeMemberName(chore?.assignee || ''))
  const [day, setDay] = useState(chore?.day || DAYS[new Date().getDay()])
  const [points, setPoints] = useState(chore?.points ?? 0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      showNotice('Please enter a chore name.', 'error')
      return
    }
    const data = {
      name: trimmed,
      assignee: normalizeMemberName(assignee),
      day,
      points: Math.max(0, parseInt(points, 10) || 0),
    }
    setBusy(true)
    try {
      if (editing) {
        await updateChore(chore.id, {
          ...data,
          done: chore.done || false,
          completedAt: chore.completedAt || null,
          completedBy: chore.completedBy || '',
        })
      } else {
        await addChore(data)
      }
      showNotice('Chore saved.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save that chore.", 'error')
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
      await deleteChore(chore.id)
      showNotice('Chore deleted.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that chore.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(440px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>{editing ? 'Edit Chore' : 'Add Chore'}</h3>

      <label className="field-label" htmlFor="chore-name">Chore *</label>
      <input
        id="chore-name"
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Take out the trash"
        autoFocus
      />

      <div className="form-2col">
        <div>
          <label className="field-label" htmlFor="chore-assignee">Assignee</label>
          <AssigneeSelect id="chore-assignee" value={assignee} onChange={setAssignee} />
        </div>
        <div>
          <label className="field-label" htmlFor="chore-day">Day</label>
          <select
            id="chore-day"
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
        </div>
      </div>

      <label className="field-label" htmlFor="chore-points">Points (kids)</label>
      <input
        id="chore-points"
        type="number"
        min="0"
        className="field"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
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
          Save chore
        </button>
      </div>
    </Modal>
  )
}
