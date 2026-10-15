// "Who are you?" — the kid picker. Each card shows how much that child has
// left to do today.
//
// This used to be two pages in one file, switched by a `parentOnly` prop:
// the picker, and the grown-ups' settings screen. They shared no logic, only
// a file, and each one paid to compute the other's data on every render.
// Family settings is now FamilySettingsPage.jsx.

import { Link } from 'react-router-dom'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { DAYS, KIDS } from '../../lib/family.js'
import { kidTheme } from '../../lib/kidThemes.js'
import { assignedOpenTasksFor, isOverdueChore } from './kidsUtils.js'
import './kids.css'

export default function KidSelector({ onSelectKid }) {
  const { chores } = useChores()
  const { todos } = useTodos()

  const todayIndex = new Date().getDay()
  const dayName = DAYS[todayIndex]

  function badgeFor(name) {
    const myChores = chores.filter(
      (c) => c.assignee === name && (c.day === dayName || isOverdueChore(c, todayIndex)),
    )
    const myTasks = assignedOpenTasksFor(todos, name)
    const openChores = myChores.filter((c) => !c.done)
    const total = openChores.length + myTasks.length
    const allDone = (myChores.length > 0 || myTasks.length > 0) && total === 0
    if (allDone) return { text: 'All done ✓', cls: 'all-done' }
    if (total > 0) return { text: `${total} to do`, cls: 'has-items' }
    return null
  }

  return (
    <div className="page page-enter">
      <header className="page-head">
        <h1 className="page-title">Kids</h1>
      </header>

      <div className="kid-select-shell">
        <div className="kid-btns">
          {KIDS.map((name) => {
            const theme = kidTheme(name)
            const badge = badgeFor(name)
            return (
              <button
                key={name}
                type="button"
                className="kid-btn"
                style={{ '--kid-accent': theme.color }}
                onClick={() => onSelectKid(name)}
                aria-label={`Open ${name}'s dashboard`}
              >
                <span className="kid-btn-emoji">{theme.emoji}</span>
                <span className="kid-btn-info">
                  <span className="kid-btn-name">{name}</span>
                </span>
                {badge && <span className={`kid-btn-badge ${badge.cls}`}>{badge.text}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <Link className="kids-parent-entry" to="/parent">
        <strong>For the grown-ups</strong>
        <span>Requests, points & screen time →</span>
      </Link>
    </div>
  )
}
