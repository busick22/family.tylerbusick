import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodoLists, normalizedTodoListId } from '../../state/TodoListsContext.jsx'
import { DAYS, todayStr } from '../../lib/family.js'
import AssigneeSelect from '../planner/AssigneeSelect.jsx'

export default function WorkEditModal({ item, onClose, showNotice }) {
  const tasks = useTodos()
  const chores = useChores()
  const { lists } = useTodoLists()
  const editing = Boolean(item?.id)
  const [kind, setKind] = useState(item?.kind || 'task')
  const [title, setTitle] = useState(item?.title || item?.text || item?.name || '')
  const [assignee, setAssignee] = useState(item?.assignee || '')
  const [date, setDate] = useState(item?.dueDate || item?.date || '')
  const [day, setDay] = useState(item?.day || DAYS[new Date((item?.date || todayStr()) + 'T12:00:00').getDay()])
  const [listId, setListId] = useState(normalizedTodoListId(item?.listId))
  const [points, setPoints] = useState(item?.points || 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save(event) {
    event.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    setError('')
    try {
      const shared = { assignee, points: Math.max(0, parseInt(points, 10) || 0) }
      if (kind === 'chore') {
        const data = { ...shared, name: title.trim(), day }
        if (editing) await chores.updateChore(item.id, data)
        else await chores.addChore(data)
      } else {
        const data = { ...shared, text: title.trim(), dueDate: date || null, listId }
        if (editing) await tasks.updateTodo(item.id, data)
        else await tasks.addTodo(data)
      }
      showNotice('To-do saved.', 'success')
      onClose()
    } catch { setError('Could not save. Your changes are still here; please try again.'); setBusy(false) }
  }
  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true)
    setBusy(true)
    try {
      // Deletion keeps earned history, matching existing parent-management behavior.
      if (kind === 'chore') await chores.deleteChore(item.id)
      else await tasks.deleteTodo(item.id)
      showNotice('To-do deleted.', 'success')
      onClose()
    } catch { setError('Could not delete this to-do. Please try again.'); setBusy(false) }
  }
  return <Modal onClose={busy ? () => {} : onClose} width="min(520px, 100%)">
    <button className="icon-btn modal-close" onClick={onClose} disabled={busy} aria-label="Close"><X aria-hidden="true" /></button>
    <h3>{editing ? 'Edit to-do' : 'Add a to-do'}</h3>
    <form onSubmit={save}>
      <label className="field-label" htmlFor="work-title">What needs doing?</label>
      <input id="work-title" className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Sign the field trip form" required autoFocus />
      <label className="field-label" htmlFor="work-person">Who is it for?</label>
      <AssigneeSelect id="work-person" value={assignee} onChange={setAssignee} />
      {!editing && <><label className="field-label" htmlFor="work-repeat">Repeats</label><select id="work-repeat" className="field" value={kind} onChange={e => setKind(e.target.value)}><option value="task">Does not repeat</option><option value="chore">Every week</option></select></>}
      {kind === 'chore' ? <><label className="field-label" htmlFor="work-day">Every</label><select id="work-day" className="field" value={day} onChange={e => setDay(e.target.value)}>{DAYS.map(d => <option key={d}>{d}</option>)}</select></>
        : <><label className="field-label" htmlFor="work-date">Date · optional</label><input id="work-date" type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></>}
      <details className="work-options">
        <summary>List & points</summary>
        {kind === 'task' && <><label className="field-label" htmlFor="work-list">List</label><select className="field" id="work-list" value={listId} onChange={e => setListId(e.target.value)}>{lists.map(list => <option value={list.id} key={list.id}>{list.name}</option>)}</select></>}
        <label className="field-label" htmlFor="work-points">Points for kids</label><input id="work-points" type="number" min="0" className="field" value={points} onChange={e => setPoints(e.target.value)} />
      </details>
      {error && <p className="workspace-status" role="alert">{error}</p>}
      <div className="modal-actions">
        {editing && <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>{confirmDelete ? 'Confirm delete' : 'Delete'}</button>}
        <span className="modal-actions-gap" /><button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save to-do'}</button>
      </div>
    </form>
  </Modal>
}
