import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { KIDS } from '../../lib/family.js'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { dayLabel } from '../../lib/planning.js'

export default function WorkRow({ item, onEdit, showNotice }) {
  const { toggleTodo } = useTodos()
  const { toggleChore } = useChores()
  const [busy, setBusy] = useState(false)
  const [chooseChild, setChooseChild] = useState(false)
  async function toggle(done, actor) {
    setBusy(true)
    try {
      if (item.kind === 'chore') await toggleChore(item.id, done, actor)
      else await toggleTodo(item.id, done, actor)
      setChooseChild(false)
    } catch { showNotice('Could not update this to-do. Please try again.', 'error') }
    finally { setBusy(false) }
  }
  return <div className="work-row" data-done={Boolean(item.done)}>
    <label className="work-check"><input type="checkbox" checked={Boolean(item.done)} disabled={busy} onChange={e => {
      if (e.target.checked && item.points > 0 && (!item.assignee || item.assignee === 'Kids')) setChooseChild(true)
      else toggle(e.target.checked)
    }} aria-label={'Mark ' + item.title + (item.done ? ' incomplete' : ' complete')} /></label>
    <button className="work-edit" onClick={() => onEdit(item)}><strong>{item.title}</strong><small>{item.kind === 'chore' ? 'Every ' + item.day : item.date ? dayLabel(item.date) : 'No date'}{item.points ? ' · ' + item.points + ' pts' : ''}</small></button>
    <span className="work-owner">{item.assignee || 'Anyone'}</span>
    {chooseChild && <Modal onClose={() => { if (!busy) setChooseChild(false) }}>
      <button className="icon-btn modal-close" aria-label="Close" disabled={busy} onClick={() => setChooseChild(false)}><X aria-hidden="true" /></button>
      <h3>Who completed this?</h3><p className="muted-copy">{item.title} · {item.points} points</p>
      <div className="modal-actions">{KIDS.map(kid => <button className="btn" key={kid} disabled={busy} onClick={() => toggle(true, kid)}>{kid}</button>)}</div>
      <button className="btn" disabled={busy} onClick={() => toggle(true)}>Someone else · no points</button>
    </Modal>}
  </div>
}
