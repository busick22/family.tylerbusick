// A single kid's dashboard: sticky header, Today/Points/History tabs, a
// floating add-task button, and the modals those tabs open.

import { useState } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
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

const TABS = [
  { id: 'today', key: 'tabToday' },
  { id: 'points', key: 'tabPoints' },
  { id: 'history', key: 'tabHistory' },
]

export default function KidDashboard({ kid, onSwitchKid }) {
  const theme = kidTheme(kid)
  const actions = useKidActions(kid)
  const [notice, showNotice] = useNotice()
  const [tab, setTab] = useState('today')
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
          {TABS.map(({ id, key }) => (
            <button
              key={id}
              type="button"
              className="kid-tab"
              data-active={tab === id}
              onClick={() => setTab(id)}
            >
              {theme[key]}
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

        <button
          type="button"
          className="fab"
          style={{ background: theme.color }}
          onClick={() => setEditingTask(null)}
          aria-label="Add task"
        >
          <Plus aria-hidden="true" />
        </button>
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
