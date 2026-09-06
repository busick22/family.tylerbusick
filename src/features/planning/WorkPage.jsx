import ListsNav from './ListsNav.jsx'
import QuickCapture from '../home/QuickCapture.jsx'
import '../home/home.css'
import { useTick } from '../kids/useTick.js'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodoLists, normalizedTodoListId } from '../../state/TodoListsContext.jsx'
import { todayStr } from '../../lib/family.js'
import { workGroup, workItems } from '../../lib/planning.js'
import AssigneeSelect from '../planner/AssigneeSelect.jsx'
import TodoListModal from '../planner/TodoListModal.jsx'
import Notice, { useNotice } from '../../components/Notice.jsx'
import WorkEditModal from './WorkEditModal.jsx'
import WorkRow from './WorkRow.jsx'
import ListManager from './ListManager.jsx'

export default function WorkPage() {
  useTick(60_000)
  const tasks = useTodos()
  const chores = useChores()
  const { lists } = useTodoLists()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(undefined)
  const [newList, setNewList] = useState(false)
  const [manageLists, setManageLists] = useState(false)
  const [notice, showNotice] = useNotice()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const filter = params.get('view') || 'open'
  const who = params.get('who') || ''
  const list = params.get('list') || ''
  const query = params.get('q') || ''
  function change(key, value) { setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next }, { replace: true }) }
  const today = todayStr()
  const all = workItems(tasks.todos, chores.chores, today)
  const visible = all.filter(item => {
    if (filter === 'done' ? !item.done : item.done) return false
    if (filter === 'today' && (!item.date || item.date > today)) return false
    if (filter === 'repeat' && item.kind !== 'chore') return false
    if (who && item.assignee !== who) return false
    if (list && (item.kind !== 'task' || normalizedTodoListId(item.listId) !== list)) return false
    return (item.title || '').toLowerCase().includes(query.toLowerCase())
  }).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.title || '').localeCompare(b.title || ''))
  const error = tasks.error || chores.error
  const loading = tasks.loading || chores.loading
  async function reset() {
    if (!confirmReset) return setConfirmReset(true)
    setResetting(true)
    try { await chores.resetWeek(); showNotice('Weekly checkmarks reset.', 'success'); setConfirmReset(false) }
    catch { showNotice('Could not reset checkmarks.', 'error') }
    finally { setResetting(false) }
  }
  return <div className="page page-enter">
    <Notice notice={notice} />
    <header className="workspace-title"><h1>Lists</h1>
      <button className="btn btn-primary" onClick={() => setEditing({ assignee: who, listId: list })}><Plus size={18} aria-hidden="true" /> Add with details</button></header>
    <ListsNav />
    <QuickCapture compact listId={list || 'general'} assignee={who} onAdded={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete('view'); next.delete('q'); return next }, { replace: true })} />
    <details className="list-refine"><summary>Find & filter{(who || list || query) ? ' · Filters active' : ''}</summary><div className="work-toolbar">
      <input className="field work-search" type="search" aria-label="Search to-dos" placeholder="Find a to-do…" value={query} onChange={e => change('q', e.target.value)} />
      <AssigneeSelect value={who} onChange={v => change('who', v)} filterMode ariaLabel="Filter by person" />
      <select className="field" aria-label="Filter by list" value={list} onChange={e => change('list', e.target.value)}><option value="">All lists</option>{lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
    </div></details>
    <nav className="work-filters" aria-label="To-do views">{[['open', 'All open'], ['today', 'Due now'], ['repeat', 'Weekly chores'], ['done', 'Completed']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => change('view', value)}>{label}</button>)}</nav>
    {error && <p className="workspace-status" role="alert">{error}</p>}
    {loading && !error && <p className="workspace-status" role="status">Loading to-dos…</p>}
    {!loading && !error && !visible.length && <div className="workspace-surface empty-workspace"><h2>{all.length ? 'Nothing in this view' : 'No to-dos yet'}</h2>{all.length && <p>Try another person, list, or view.</p>}<button className="btn" onClick={() => setEditing({})}>Add a to-do</button></div>}
    {['Overdue', 'Earlier this week', 'Today', 'Upcoming', 'Anytime', 'Completed'].map(group => {
      const items = visible.filter(item => workGroup(item, today) === group)
      return items.length ? <section className="work-group" key={group}><h2>{group} · {items.length}</h2><div className="workspace-surface">{items.map(item => <WorkRow key={item.kind + item.id} item={item} onEdit={setEditing} showNotice={showNotice} />)}</div></section> : null
    })}
    <details className="work-options"><summary>Manage lists & weekly chores</summary><div className="workspace-actions">
      <button className="btn" onClick={() => setNewList(true)}>New list</button><button className="btn" onClick={() => setManageLists(true)}>Manage lists</button>
      <button className="btn" onClick={reset} disabled={resetting}>{confirmReset ? 'Confirm reset of all weekly checkmarks' : 'Reset weekly checkmarks'}</button>
      {confirmReset && <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel reset</button>}
    </div><p className="empty-inline">Start a new week by clearing everyone’s chore checkmarks. Earned points are kept.</p></details>
    {editing !== undefined && <WorkEditModal item={editing} onClose={() => setEditing(undefined)} showNotice={showNotice} />}
    {newList && <TodoListModal onClose={() => setNewList(false)} showNotice={showNotice} />}
    {manageLists && <ListManager onClose={() => setManageLists(false)} showNotice={showNotice} />}
  </div>
}
