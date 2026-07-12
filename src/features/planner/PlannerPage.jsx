// Planner — port of the old productivity.html/js. Four tabs (Today,
// Calendar, Tasks, Chores), a Family Settings modal, and a floating +
// button that quick-adds an event, task, or chore.

import { useState } from 'react'
import {
  Sunrise, CalendarDays, CheckSquare, Brush, Plus, X, Settings as SettingsIcon,
} from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import Notice, { useNotice } from '../../components/Notice.jsx'
import TodayTab from './TodayTab.jsx'
import CalendarTab from './CalendarTab.jsx'
import TasksTab from './TasksTab.jsx'
import ChoresTab from './ChoresTab.jsx'
import TodoModal from './TodoModal.jsx'
import ChoreModal from './ChoreModal.jsx'
import EventModal from './EventModal.jsx'
import TodoListModal from './TodoListModal.jsx'
import SettingsModal from './SettingsModal.jsx'
import './planner.css'

const TABS = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'chores', label: 'Chores', icon: Brush },
]

export default function PlannerPage() {
  const [notice, showNotice] = useNotice()
  const [tab, setTab] = useState('today')

  // Modal state. For todo/chore/event: undefined = closed, null = new,
  // object = editing that item.
  const [editTodo, setEditTodo] = useState(undefined)
  const [editChore, setEditChore] = useState(undefined)
  const [editEvent, setEditEvent] = useState(undefined)
  const [listModalOpen, setListModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  function quickAdd(kind) {
    setQuickAddOpen(false)
    if (kind === 'event') setEditEvent(null)
    if (kind === 'task') setEditTodo(null)
    if (kind === 'chore') setEditChore(null)
  }

  return (
    <div className="page page-enter" data-page="planner" data-scroll="locked">
      <Notice notice={notice} />

      <header className="page-head">
        <h1 className="page-title">
          Planner
          <small>Calendar, tasks &amp; chores</small>
        </h1>
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Family Settings" aria-label="Family Settings">
          <SettingsIcon aria-hidden="true" />
        </button>
      </header>

      <nav className="seg-tabs" aria-label="Planner sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className="seg-tab"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon aria-hidden="true" size={17} />
            {label}
          </button>
        ))}
      </nav>

      <div className="page-scroll planner-scroll">
        {tab === 'today' && <TodayTab onAddEvent={() => setEditEvent(null)} showNotice={showNotice} />}
        {tab === 'calendar' && <CalendarTab onAddEvent={() => setEditEvent(null)} />}
        {tab === 'tasks' && (
          <TasksTab
            onEditTodo={(t) => setEditTodo(t)}
            onNewList={() => setListModalOpen(true)}
            showNotice={showNotice}
          />
        )}
        {tab === 'chores' && <ChoresTab onEditChore={(c) => setEditChore(c)} showNotice={showNotice} />}
      </div>

      <button className="fab" onClick={() => setQuickAddOpen(true)} aria-label="Add">
        <Plus aria-hidden="true" />
      </button>

      {editTodo !== undefined && (
        <TodoModal todo={editTodo} onClose={() => setEditTodo(undefined)} showNotice={showNotice} />
      )}
      {editChore !== undefined && (
        <ChoreModal chore={editChore} onClose={() => setEditChore(undefined)} showNotice={showNotice} />
      )}
      {editEvent !== undefined && (
        <EventModal event={editEvent} onClose={() => setEditEvent(undefined)} showNotice={showNotice} />
      )}
      {listModalOpen && (
        <TodoListModal onClose={() => setListModalOpen(false)} showNotice={showNotice} />
      )}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} showNotice={showNotice} />
      )}

      {quickAddOpen && (
        <Modal onClose={() => setQuickAddOpen(false)} width="min(420px, 100%)">
          <button
            className="icon-btn modal-close"
            onClick={() => setQuickAddOpen(false)}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </button>
          <h3>Add</h3>
          <div className="quick-add-actions">
            <button type="button" className="quick-add-action" onClick={() => quickAdd('event')}>
              <CalendarDays aria-hidden="true" /> Event
            </button>
            <button type="button" className="quick-add-action" onClick={() => quickAdd('task')}>
              <CheckSquare aria-hidden="true" /> Task
            </button>
            <button type="button" className="quick-add-action" onClick={() => quickAdd('chore')}>
              <Brush aria-hidden="true" /> Chore
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
