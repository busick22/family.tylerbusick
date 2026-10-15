// Create a new task list.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useTodoLists } from '../../state/TodoListsContext.jsx'
import { useNotice } from '../../state/NoticeContext.jsx'

export default function TodoListModal({ onClose }) {
  const showNotice = useNotice()
  const { createList } = useTodoLists()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      showNotice('Please provide a list name.', 'error')
      return
    }
    setBusy(true)
    try {
      const error = await createList(trimmed)
      if (error) {
        showNotice(error, 'error')
        setBusy(false)
        return
      }
      showNotice('List created.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't create that list.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(400px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>New Task List</h3>
      <label className="field-label" htmlFor="list-name">
        List name *
      </label>
      <input
        id="list-name"
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
        }}
        placeholder="e.g. Vacation prep"
        autoFocus
      />
      <div className="modal-actions">
        <span className="modal-actions-gap" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          Create list
        </button>
      </div>
    </Modal>
  )
}
