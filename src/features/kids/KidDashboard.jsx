import { useTick } from './useTick.js'
// A single kid's dashboard: sticky header, Today/Points/History/Wish Lists tabs, a
// floating add-task button, and the modals those tabs open.

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import Notice, { useNotice } from '../../components/Notice.jsx'
import { kidTheme } from '../../lib/kidThemes.js'
import { DAYS, MONTHS } from '../../lib/family.js'
import { useKidActions } from './useKidActions.js'
import TodayTab from './TodayTab.jsx'
import PointsTab from './PointsTab.jsx'
import HistoryTab from './HistoryTab.jsx'
import KidTaskModal from './KidTaskModal.jsx'
import KidChoreModal from './KidChoreModal.jsx'
import TimeRequestModal from './TimeRequestModal.jsx'
import WishListsTab from './WishListsTab.jsx'

const TABS = [
  { id: 'today', label: 'My day' },
  { id: 'wishes', label: 'Wish lists' },
  { id: 'points', label: 'Points & rewards' },
  { id: 'history', label: 'History' },
]

export default function KidDashboard({ kid, onSwitchKid }) {
  useTick(60_000)
  const theme = kidTheme(kid)
  const actions = useKidActions(kid)
  const [notice, showNotice] = useNotice()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'today'
  function setTab(value) { setParams(previous => { const next = new URLSearchParams(previous); next.set('tab', value); return next }) }
  const [editingTask, setEditingTask] = useState(undefined) // undefined=closed, null=new, obj=edit
  const [editingChore, setEditingChore] = useState(null)
  const [askingMoreTime, setAskingMoreTime] = useState(false)

  const now = new Date()
  const dateLabel = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`

  return (
    <div className="kid-dash" style={{ '--kc': theme.color }}>
      <Notice notice={notice} />

      <div className="kid-hdr">
        <div className="kid-hdr-left">
          <span className="kid-hdr-emoji">{theme.emoji}</span>
          <div>
            <div className="kid-hdr-name">Hi, {kid}!</div>
            <div className="kid-hdr-date">{dateLabel}</div>
          </div>
        </div>
        <button type="button" className="btn-switch-kid" onClick={onSwitchKid}>
          <RefreshCw aria-hidden="true" size={14} /> Switch kid
        </button>
      </div>

      <div className="kid-shell">
        <div className="kid-tabs">
          {TABS.map(({ id, key, label }) => (
            <button
              key={id}
              type="button"
              className="kid-tab"
              data-active={tab === id}
              onClick={() => setTab(id)}
            >
              {label || theme[key]}
            </button>
          ))}
        </div>

        {tab === 'today' && (
          <TodayTab
            kid={kid}
            theme={theme}
            onEditTask={(t) => setEditingTask(t)}
            onEditChore={(c) => setEditingChore(c)}
            onAskMoreTime={() => setAskingMoreTime(true)}
          />
        )}
        {tab === 'points' && <PointsTab kid={kid} />}
        {tab === 'history' && <HistoryTab kid={kid} />}
        {tab === 'wishes' && <WishListsTab kid={kid} />}


      </div>

      {editingTask !== undefined && (
        <KidTaskModal
          task={editingTask}
          onClose={() => setEditingTask(undefined)}
          showNotice={showNotice}
          onSave={(text, dueDate) =>
            editingTask ? actions.editTask(editingTask.id, text, dueDate) : actions.addTask(text, dueDate)
          }
          onDelete={editingTask ? () => actions.deleteTask(editingTask.id) : undefined}
        />
      )}

      {editingChore && (
        <KidChoreModal
          chore={editingChore}
          onClose={() => setEditingChore(null)}
          showNotice={showNotice}
          onSave={(name, day) => actions.editChore(editingChore.id, name, day)}
          onDelete={() => actions.deleteChore(editingChore.id)}
        />
      )}

      {askingMoreTime && (
        <TimeRequestModal kid={kid} onClose={() => setAskingMoreTime(false)} showNotice={showNotice} />
      )}
    </div>
  )
}
