// Parent admin — family member list (used for task/chore/event assignment
// everywhere else in the app). Thin wrapper around MembersContext.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../../components/Modal.jsx'
import { useMembers } from '../../../state/MembersContext.jsx'

export default function MembersModal({ onClose, showNotice }) {
  const { members, memberColor, addMember, removeMember } = useMembers()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      const ok = await addMember(trimmed)
      if (ok) setName('')
      else showNotice?.('That person is already in the family.', 'info')
    } catch (error) {
      console.error(error)
      showNotice?.("Couldn't add that member.", 'error')
    } finally { setBusy(false) }
  }

  async function remove(nameToRemove) {
    setBusy(true)
    try {
      await removeMember(nameToRemove)
    } catch (error) {
      console.error(error)
      showNotice?.("Couldn't remove that member.", 'error')
    } finally { setBusy(false) }
  }

  return (
    <Modal onClose={onClose} width="min(480px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>👥 Family Members</h3>
      <p className="admin-hint">Names used for task, chore, and event assignments.</p>

      <div className="admin-member-list">
        {members.length === 0 && <span className="admin-empty">No members yet.</span>}
        {members.map((m) => (
          <span key={m} className="admin-member-chip" style={{ background: memberColor(m) }}>
            {m}
            <button type="button" disabled={busy} onClick={() => remove(m)} aria-label={`Remove ${m}`}>
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className="admin-add-row">
        <input
          className="field"
          disabled={busy}
          placeholder="Add name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={add}>
          ＋ Add
        </button>
      </div>

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}
