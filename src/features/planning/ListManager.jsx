import { useState } from 'react'
import { ArrowUp, ArrowDown, X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useTodoLists, normalizedTodoListId } from '../../state/TodoListsContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'

export default function ListManager({ onClose, showNotice }) {
  const { lists, reorder, deleteList } = useTodoLists()
  const { todos } = useTodos()
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  async function act(callback) {
    setBusy(true)
    try { await callback(); setConfirm(null) }
    catch { showNotice('Could not update lists. Please try again.', 'error') }
    finally { setBusy(false) }
  }
  function move(index, direction) {
    const ids = lists.map(list => list.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    act(() => reorder(ids))
  }
  return <Modal onClose={onClose}><button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button><h3>Manage lists</h3>
    <p className="muted-copy">Deleting a list moves its to-dos to General.</p>
    {lists.map((list, index) => <div className="work-row" key={list.id}><strong className="work-edit">{list.name}</strong>
      <button className="icon-btn" disabled={busy || !index} aria-label={'Move ' + list.name + ' up'} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
      <button className="icon-btn" disabled={busy || index === lists.length - 1} aria-label={'Move ' + list.name + ' down'} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
      {list.id !== 'general' && <button className="btn btn-ghost" disabled={busy} onClick={() => confirm === list.id ? act(() => deleteList(list.id, todos.filter(t => normalizedTodoListId(t.listId) === list.id).map(t => t.id))) : setConfirm(list.id)}>{confirm === list.id ? 'Confirm' : 'Delete'}</button>}
    </div>)}<div className="modal-actions"><button className="btn" onClick={onClose}>Done</button></div>
  </Modal>
}
