// One task row: checkbox, tappable body (opens the edit modal), assignee
// badge, delete with a two-tap confirm.

import { useState } from 'react'
import { X } from 'lucide-react'
import { useMembers } from '../../state/MembersContext.jsx'
import { dateLabel, dateClass, formatDoneMeta } from './plannerUtils.js'

export default function TaskRow({ todo, onToggle, onEdit, onDelete }) {
  const { memberColor } = useMembers()
  const [confirming, setConfirming] = useState(false)

  const doneMeta = formatDoneMeta(todo)
  const dueLabel = !todo.done && todo.dueDate ? dateLabel(todo.dueDate) : ''
  const dueCls = !todo.done && todo.dueDate ? dateClass(todo.dueDate) : ''

  return (
    <div className="task-row" data-done={!!todo.done}>
      <input
        type="checkbox"
        className="task-check"
        checked={!!todo.done}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
        aria-label={`Mark ${todo.text} ${todo.done ? 'incomplete' : 'complete'}`}
      />
      <button type="button" className="task-main" onClick={() => onEdit(todo)} title="Edit task">
        <span className="task-label">
          {todo.text}
          {(doneMeta || todo.assignee) && (
            <span className="task-meta">
              {[doneMeta, todo.assignee].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
        {dueLabel && <span className={`due-chip ${dueCls}`}>{dueLabel}</span>}
      </button>
      {todo.assignee && (
        <span className="assignee-badge" style={{ background: memberColor(todo.assignee) }}>
          {todo.assignee}
        </span>
      )}
      {confirming ? (
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(todo.id)}
          onBlur={() => setConfirming(false)}
        >
          Really?
        </button>
      ) : (
        <button
          type="button"
          className="icon-btn task-remove"
          onClick={() => setConfirming(true)}
          title="Delete task"
          aria-label={`Delete task ${todo.text}`}
        >
          <X aria-hidden="true" size={15} />
        </button>
      )}
    </div>
  )
}
