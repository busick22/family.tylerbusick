import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { KIDS } from '../../lib/family.js'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { dayLabel } from '../../lib/planning.js'
import { useNotice } from '../../state/NoticeContext.jsx'

export default function WorkRow({ item, onEdit }) {
  const showNotice = useNotice()
  const { toggleTodo } = useTodos()
  const { toggleChore } = useChores()
  const [busy, setBusy] = useState(false)
  const [chooseChild, setChooseChild] = useState(false)

  // Completion runs as a Firestore transaction, which waits for the server
  // rather than applying locally first. Show the new state straight away and
  // roll back only if the write actually fails.
  const done = Boolean(item.done)
  const [pending, setPending] = useState(null)
  const shown = pending === null ? done : pending
  useEffect(() => {
    setPending((p) => (p === null || p === done ? null : p))
  }, [done])

  async function toggle(next, actor) {
    setBusy(true)
    setPending(next)
    try {
      if (item.kind === 'chore') await toggleChore(item.id, next, actor)
      else await toggleTodo(item.id, next, actor)
      setChooseChild(false)
    } catch {
      setPending(null)
      showNotice('Could not update this to-do. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="work-row" data-done={shown}>
      <label className="work-check">
        <input
          type="checkbox"
          checked={shown}
          disabled={busy}
          onChange={(e) => {
            if (e.target.checked && item.points > 0 && (!item.assignee || item.assignee === 'Kids'))
              setChooseChild(true)
            else toggle(e.target.checked)
          }}
          aria-label={'Mark ' + item.title + (shown ? ' incomplete' : ' complete')}
        />
      </label>
      <button className="work-edit" onClick={() => onEdit(item)}>
        <strong>{item.title}</strong>
        <small>
          {item.kind === 'chore' ? 'Every ' + item.day : item.date ? dayLabel(item.date) : 'No date'}
          {item.points ? ' · ' + item.points + ' pts' : ''}
        </small>
      </button>
      <span className="work-owner">{item.assignee || 'Anyone'}</span>
      {chooseChild && (
        <Modal
          onClose={() => {
            if (!busy) setChooseChild(false)
          }}
        >
          <button
            className="icon-btn modal-close"
            aria-label="Close"
            disabled={busy}
            onClick={() => setChooseChild(false)}
          >
            <X aria-hidden="true" />
          </button>
          <h3>Who completed this?</h3>
          <p className="muted-copy">
            {item.title} · {item.points} points
          </p>
          <div className="modal-actions">
            {KIDS.map((kid) => (
              <button className="btn" key={kid} disabled={busy} onClick={() => toggle(true, kid)}>
                {kid}
              </button>
            ))}
          </div>
          <button className="btn" disabled={busy} onClick={() => toggle(true)}>
            Someone else · no points
          </button>
        </Modal>
      )}
    </div>
  )
}
