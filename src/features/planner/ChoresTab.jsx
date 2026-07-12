// Chores tab: the weekly routines, grouped by day, with a reset-week
// danger zone at the bottom.

import { useMemo, useState } from 'react'
import { Plus, Pencil, X, RotateCcw } from 'lucide-react'
import { useChores } from '../../state/ChoresContext.jsx'
import { useMembers } from '../../state/MembersContext.jsx'
import { DAYS, normalizeMemberName } from '../../lib/family.js'
import AssigneeSelect from './AssigneeSelect.jsx'
import { isOverdueChore, formatDoneMeta } from './plannerUtils.js'

export default function ChoresTab({ onEditChore, showNotice }) {
  const { chores, toggleChore, deleteChore, resetWeek } = useChores()
  const { memberColor } = useMembers()
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const todayIndex = new Date().getDay()
  const todayName = DAYS[todayIndex]

  const visible = useMemo(
    () => chores.filter((c) => !assigneeFilter || c.assignee === assigneeFilter),
    [chores, assigneeFilter],
  )

  const byDay = useMemo(() => {
    const groups = {}
    DAYS.forEach((d) => {
      groups[d] = []
    })
    visible.forEach((c) => {
      if (groups[c.day]) groups[c.day].push(c)
    })
    return groups
  }, [visible])

  const todayCount = visible.filter((c) => c.day === todayName).length
  const openCount = visible.filter(
    (c) => !c.done && (c.day === todayName || isOverdueChore(c, todayIndex)),
  ).length
  const overdueCount = visible.filter((c) => isOverdueChore(c, todayIndex)).length

  async function handleToggle(id, done) {
    try {
      await toggleChore(id, done)
    } catch (e) {
      console.error(e)
      showNotice("Couldn't update that chore.", 'error')
    }
  }

  async function handleDelete(id) {
    setConfirmingDeleteId(null)
    try {
      await deleteChore(id)
      showNotice('Chore deleted.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that chore.", 'error')
    }
  }

  async function handleReset() {
    setConfirmingReset(false)
    try {
      await resetWeek()
      showNotice('Chores reset for the week.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't reset chores.", 'error')
    }
  }

  return (
    <div className="chores-tab">
      <div className="card planner-explainer">
        <div>
          <div className="planner-explainer-title">Chores are the repeating weekly routines.</div>
          <p className="planner-explainer-copy">
            Use chores for the things that come back every week. If it only needs to happen once,
            keep it in Tasks so it doesn&rsquo;t clutter the weekly routine list.
          </p>
        </div>
      </div>

      <div className="planner-toolbar">
        <button className="btn btn-sm" onClick={() => onEditChore(null)}>
          <Plus aria-hidden="true" size={15} /> Chore
        </button>
        <AssigneeSelect
          value={assigneeFilter}
          onChange={(v) => setAssigneeFilter(normalizeMemberName(v))}
          filterMode
          ariaLabel="Filter chores by assignee"
        />
      </div>

      <div className="summary-pills">
        <span className="summary-pill">
          <strong>{todayCount}</strong> due today
        </span>
        <span className="summary-pill">
          <strong>{openCount}</strong> still open
        </span>
        <span className="summary-pill">
          <strong>{overdueCount}</strong> overdue
        </span>
        <span className="summary-pill muted">
          {assigneeFilter ? `Filtered to ${assigneeFilter}` : 'Whole family'}
        </span>
      </div>

      {visible.length ? (
        DAYS.filter((d) => byDay[d].length).map((day) => (
          <div className="card planner-panel chore-day-panel" key={day}>
            <div className="chore-day-head" data-today={day === todayName}>
              {day}
            </div>
            {byDay[day].map((c) => {
              const doneMeta = formatDoneMeta(c)
              return (
                <div className="task-row" data-done={!!c.done} key={c.id}>
                  <input
                    type="checkbox"
                    className="task-check"
                    checked={!!c.done}
                    onChange={(e) => handleToggle(c.id, e.target.checked)}
                    aria-label={`Mark ${c.name} ${c.done ? 'incomplete' : 'complete'}`}
                  />
                  <span className="task-label">
                    {c.name}
                    {(doneMeta || c.assignee) && (
                      <span className="task-meta">
                        {[doneMeta, c.assignee].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  {c.assignee && (
                    <span className="assignee-badge" style={{ background: memberColor(c.assignee) }}>
                      {c.assignee}
                    </span>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onEditChore(c)}
                    title="Edit chore"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil aria-hidden="true" size={14} />
                  </button>
                  {confirmingDeleteId === c.id ? (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(c.id)}
                      onBlur={() => setConfirmingDeleteId(null)}
                    >
                      Really?
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setConfirmingDeleteId(c.id)}
                      title="Delete chore"
                      aria-label={`Delete ${c.name}`}
                    >
                      <X aria-hidden="true" size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))
      ) : (
        <p className="planner-empty">No chores match this filter.</p>
      )}

      <div className="card danger-zone">
        <div className="danger-title">Reset Week</div>
        <p className="danger-copy">
          Clears all chore checkmarks so you can start a fresh week. This cannot be undone.
        </p>
        {confirmingReset ? (
          <div className="danger-confirm">
            <span>Reset all chore checkmarks?</span>
            <button className="btn btn-danger btn-sm" onClick={handleReset}>
              Yes, reset
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmingReset(true)}>
            <RotateCcw aria-hidden="true" size={14} /> Reset this week&rsquo;s chores
          </button>
        )}
      </div>
    </div>
  )
}
