import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useMeals } from '../../state/MealsContext.jsx'
import { useTurns } from '../../state/TurnsContext.jsx'
import { DAYS, todayStr } from '../../lib/family.js'
import {
  assignedTasksFor,
  everyoneTasks,
  isOverdueChore,
  isTaskChecked,
  sortKidTasks,
  taskShowLabel,
} from './kidsUtils.js'
import { useKidActions } from './useKidActions.js'
import KidItemRow from './KidItemRow.jsx'
import TimerCard from './TimerCard.jsx'

export default function TodayTab({ kid, theme, onEditTask, onEditChore, onAskMoreTime }) {
  const taskState = useTodos()
  const choreState = useChores()
  const { meals } = useMeals()
  const { moviePicker, dogFeeder } = useTurns()
  const actions = useKidActions(kid)
  const [taskInput, setTaskInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const today = todayStr()
  const dayName = DAYS[new Date().getDay()]
  const chores = choreState.chores.filter(
    (c) => c.assignee === kid && (c.day === dayName || isOverdueChore(c)),
  )
  const tasks = sortKidTasks(assignedTasksFor(taskState.todos, kid))
  const extras = [
    ...sortKidTasks(everyoneTasks(taskState.todos)).map((task) => ({ ...task, kind: 'task' })),
    ...choreState.chores
      .filter((chore) => chore.assignee === 'Kids' && (chore.day === dayName || isOverdueChore(chore)))
      .map((chore) => ({ ...chore, kind: 'chore' })),
  ]
  const total = chores.length + tasks.length
  const done = chores.filter((c) => c.done).length + tasks.filter(isTaskChecked).length
  const loading = taskState.loading || choreState.loading
  const loadError = taskState.error || choreState.error
  async function add(event) {
    event.preventDefault()
    if (!taskInput.trim()) return
    setBusy(true)
    setError('')
    try {
      await actions.addTask(taskInput.trim(), today)
      setTaskInput('')
    } catch {
      setError('Could not add your to-do. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="kid-day-layout">
      <section>
        <div className="section-heading">
          <h2>My day</h2>
          {!loading && !loadError && (
            <span className="muted-copy">
              {done} of {total} done
            </span>
          )}
        </div>
        {(error || loadError) && (
          <p className="workspace-status" role="alert">
            {error || loadError}
          </p>
        )}
        {loading && (
          <p className="workspace-status" role="status">
            Loading your to-dos…
          </p>
        )}
        {!loading && !loadError && total > 0 && done === total && (
          <div className="all-done">
            <span className="all-done-icon">{theme.allDoneIcon}</span>
            <div className="all-done-title">{theme.allDoneMsg}</div>
            <p>Your responsibilities are finished. Extras are optional.</p>
          </div>
        )}
        <div className="kid-panel">
          {chores.map((chore) => (
            <KidItemRow
              key={chore.id}
              label={chore.name}
              meta={isOverdueChore(chore) ? 'Earlier this week · ' + chore.day : 'Repeats weekly'}
              checked={Boolean(chore.done)}
              points={chore.points}
              particles={theme.particles}
              onToggle={(value) => actions.toggleChore(chore.id, value)}
              onEdit={() => onEditChore(chore)}
            />
          ))}
          {tasks.map((task) => (
            <KidItemRow
              key={task.id}
              label={task.text}
              meta={task.dueDate ? taskShowLabel(task.dueDate) : 'Anytime'}
              checked={isTaskChecked(task)}
              points={task.points}
              particles={theme.particles}
              onToggle={(value) => actions.toggleTask(task.id, value)}
              onEdit={() => onEditTask(task)}
            />
          ))}
        </div>
        {!loading && !loadError && !total && (
          <div className="empty-workspace">
            <h2>All done</h2>
            <p>Nothing to do right now.</p>
          </div>
        )}
        <form className="k-add-row" onSubmit={add}>
          <input
            className="field"
            aria-label="New personal to-do"
            placeholder="Add something to do…"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={busy}>
            Add
          </button>
        </form>
        {extras.length > 0 && (
          <details className="work-options">
            <summary>Optional extras · {extras.length}</summary>
            <div className="kid-panel">
              {extras.map((item) => (
                <KidItemRow
                  key={item.kind + item.id}
                  label={item.text || item.name}
                  meta={
                    item.kind === 'chore'
                      ? 'Optional extra · every ' + item.day
                      : 'Optional extra for any kid'
                  }
                  checked={item.kind === 'chore' ? Boolean(item.done) : isTaskChecked(item)}
                  points={item.points}
                  particles={theme.particles}
                  onToggle={(value) =>
                    item.kind === 'chore'
                      ? actions.toggleChore(item.id, value)
                      : actions.toggleTask(item.id, value)
                  }
                  onEdit={() => (item.kind === 'chore' ? onEditChore(item) : onEditTask(item))}
                />
              ))}
            </div>
          </details>
        )}
        <div className="workspace-footer-links">
          <Link to={'/lists?who=' + kid}>See all my to-dos →</Link>
        </div>
      </section>
      <aside className="kid-day-aside" aria-label="Time and family plans">
        <TimerCard kid={kid} onAskMore={onAskMoreTime} />
        {meals[today] && (
          <Link className="dinner-banner" to={'/meals?date=' + today}>
            <span className="dinner-icon" aria-hidden="true">
              🍽️
            </span>
            <div>
              <div className="dinner-label">Tonight’s dinner</div>
              <div className="dinner-meal">{meals[today].recipeName}</div>
            </div>
          </Link>
        )}
        <div className="movie-turn-banner">
          <div className="movie-turn-titlebar">Whose turn?</div>
          <div className="turn-row">
            🎥{' '}
            <span>
              Movie night · <strong>{moviePicker}</strong>
            </span>
          </div>
          <div className="turn-row">
            🐾{' '}
            <span>
              Dog feeding · <strong>{dogFeeder}</strong>
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}
