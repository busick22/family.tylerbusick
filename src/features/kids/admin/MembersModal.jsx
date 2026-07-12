// Parent admin — family member list (used for task/chore/event assignment
// everywhere else in the app). Thin wrapper around MembersContext.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../../components/Modal.jsx'
import { useMembers } from '../../../state/MembersContext.jsx'

export default function MembersModal({ onClose }) {
  const { members, memberColor, addMember, removeMember } = useMembers()
  const [name, setName] = useState('')

  async function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    const ok = await addMember(trimmed)
    if (ok) setName('')
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
        {members.map((m, i) => (
          <span key={m} className="admin-member-chip" style={{ background: memberColor(m) }}>
            {m}
            <button type="button" onClick={() => removeMember(i)} aria-label={`Remove ${m}`}>
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className="admin-add-row">
        <input
          className="field"
          placeholder="Add name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary" onClick={add}>
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
