// A kid's Today tab: screen-time timer, tonight's dinner, whose-turn
// banner, their chores (filterable by day) and tasks, plus anyone-can-do
// "extras". Celebrates with an all-done state when everything's checked.

import { useState } from 'react'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useMeals } from '../../state/MealsContext.jsx'
import { useTurns } from '../../state/TurnsContext.jsx'
import { DAYS, todayStr } from '../../lib/family.js'
import {
  assignedTasksFor, assignedOpenTasksFor, everyoneTasks, openEveryoneTasks,
  isOverdueChore, isTaskChecked, sortKidTasks, taskShowLabel,
} from './kidsUtils.js'
import { useKidActions } from './useKidActions.js'
import KidItemRow from './KidItemRow.jsx'
import TimerCard from './TimerCard.jsx'

export default function TodayTab({ kid, theme, onEditTask, onEditChore, onAskMoreTime }) {
  const { chores } = useChores()
  const { todos } = useTodos()
  const { meals } = useMeals()
  const { moviePicker, dogFeeder } = useTurns()
  const actions = useKidActions(kid)

  const [choreDay, setChoreDay] = useState('today')
  const [extrasCollapsed, setExtrasCollapsed] = useState(true)
  const [taskInput, setTaskInput] = useState('')

  const dayName = DAYS[new Date().getDay()]
  const todayIndex = new Date().getDay()
  const today = todayStr()

  const allMyChores = chores.filter((c) => c.assignee === kid)
  const focusChores = allMyChores.filter((c) => c.day === dayName || isOverdueChore(c, todayIndex))
  const todayChores = allMyChores.filter((c) => c.day === dayName)
  const myTasks = assignedTasksFor(todos, kid)
  const openMyTasks = assignedOpenTasksFor(todos, kid)
  const extraTasks = everyoneTasks(todos)
  const openExtraTasks = openEveryoneTasks(todos)
  const openFocusChores = focusChores.filter((c) => !c.done)

  const doneChores = todayChores.filter((c) => c.done).length
  const meal = meals[today]

  const activeDays = DAYS.filter((d) => allMyChores.some((c) => c.day === d))
  const filterDay = choreDay === 'today' ? dayName : choreDay === 'all' ? null : choreDay
  const choresToShow =
    filterDay === dayName
      ? allMyChores.filter((c) => c.day === dayName || isOverdueChore(c, todayIndex))
      : allMyChores.filter((c) => filterDay === null || c.day === filterDay)

  const allDone =
    (choreDay === 'today' || choreDay === dayName) &&
    (focusChores.length > 0 || myTasks.length > 0 || extraTasks.length > 0) &&
    openFocusChores.length === 0 &&
    openMyTasks.length === 0 &&
    openExtraTasks.length === 0

  async function submitNewTask() {
    const text = taskInput.trim()
    if (!text) return
    await actions.addTask(text, null)
    setTaskInput('')
  }

  function choresBySection() {
    if (choreDay === 'all') {
      return DAYS.map((d) => ({ day: d, list: choresToShow.filter((c) => c.day === d) })).filter((g) => g.list.length)
    }
    return [{ day: null, list: choresToShow }]
  }

  return (
    <div>
      <TimerCard kid={kid} onAskMore={onAskMoreTime} />

      {todayChores.length > 0 && (
        <div className="progress-strip">
          <div className="progress-header">
            <span className="progress-label">{theme.progressLabel}</span>
            <span className="progress-count">{doneChores} of {todayChores.length} done</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.round((doneChores / todayChores.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {meal?.recipeName && (
        <div className="dinner-banner">
          <span className="dinner-icon">🍽️</span>
          <div>
            <div className="dinner-label">Tonight&rsquo;s Dinner</div>
            <div className="dinner-meal">{meal.recipeName}</div>
          </div>
        </div>
      )}

      {activeDays.length > 1 && (
        <div className="day-filter-row">
          <button type="button" className="chip" data-active={choreDay === 'today'} onClick={() => setChoreDay('today')}>
            Today
          </button>
          <button type="button" className="chip" data-active={choreDay === 'all'} onClick={() => setChoreDay('all')}>
            All Days
          </button>
          {DAYS.filter((d) => activeDays.includes(d) && d !== dayName).map((d) => (
            <button key={d} type="button" className="chip" data-active={choreDay === d} onClick={() => setChoreDay(d)}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {allDone && (
        <div className="all-done">
          <span className="all-done-icon">{theme.allDoneIcon}</span>
          <div className="all-done-title">{theme.allDoneMsg}</div>
          <div className="all-done-sub">{theme.allDoneSub}</div>
        </div>
      )}

      {!allDone &&
        choresToShow.length > 0 &&
        choresBySection().map((group) => (
          <div key={group.day || 'focus'}>
            {group.day && (
              <div className={`day-group-hdr ${group.day === dayName ? 'today-hdr' : ''}`}>
                {group.day}
                {group.day === dayName ? ' · Today' : ''}
              </div>
            )}
            {!group.day && <div className="section-lbl">{theme.choreLabel}</div>}
            <div className="kid-panel">
              {group.list.map((c) => (
                <KidItemRow
                  key={c.id}
                  label={c.name}
                  meta={c.done ? '✓ Done' : isOverdueChore(c) ? `Overdue from ${c.day}` : ''}
                  checked={c.done}
                  particles={theme.particles}
                  onToggle={(done) => actions.toggleChore(c.id, done)}
                  onEdit={() => onEditChore(c)}
                />
              ))}
            </div>
          </div>
        ))}

      {!allDone && myTasks.length > 0 && (
        <>
          <div className="section-lbl">Assigned to You</div>
          <div className="kid-panel">
            {sortKidTasks(myTasks).map((t) => (
              <KidItemRow
                key={t.id}
                label={t.text}
                meta={t.dueDate ? taskShowLabel(t.dueDate) : ''}
                checked={isTaskChecked(t)}
                points={t.points || 0}
                particles={theme.particles}
                onToggle={(done) => actions.toggleTask(t.id, done)}
                onEdit={() => onEditTask(t)}
                onDelete={() => actions.deleteTask(t.id)}
              />
            ))}
          </div>
        </>
      )}

      {!allDone && extraTasks.length > 0 && (
        <>
          <button
            type="button"
            className="section-toggle"
            aria-expanded={!extrasCollapsed}
            onClick={() => setExtrasCollapsed((v) => !v)}
          >
            <span>Everyone Extras</span>
            <span className="section-toggle-meta">
              {extraTasks.length} {extraTasks.length === 1 ? 'task' : 'tasks'} · {extrasCollapsed ? 'Hidden' : 'Open'}
            </span>
            <span className="section-toggle-caret">{extrasCollapsed ? '▸' : '▾'}</span>
          </button>
          {!extrasCollapsed && (
            <div className="kid-panel">
              {sortKidTasks(extraTasks).map((t) => (
                <KidItemRow
                  key={t.id}
                  label={t.text}
                  meta={[isTaskChecked(t) ? '' : 'Optional extra for any kid', t.dueDate ? taskShowLabel(t.dueDate) : '']
                    .filter(Boolean)
                    .join(' · ')}
                  checked={isTaskChecked(t)}
                  points={t.points || 0}
                  particles={theme.particles}
                  onToggle={(done) => actions.toggleTask(t.id, done)}
                  onEdit={() => onEditTask(t)}
                  onDelete={() => actions.deleteTask(t.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!allDone && choresToShow.length === 0 && myTasks.length === 0 && extraTasks.length === 0 && (
        <div className="k-empty k-empty-lg">{theme.emptyToday}</div>
      )}

      <div className="k-add-row">
        <input
          className="field"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder={theme.addPlaceholder}
          onKeyDown={(e) => e.key === 'Enter' && submitNewTask()}
        />
        <button type="button" className="btn btn-primary" onClick={submitNewTask}>
          ＋ Add
        </button>
      </div>

      <div className="movie-turn-banner">
        <div className="movie-turn-titlebar">Whose Turn</div>
        <div className="turn-row">
          <span>🎥</span>
          <div className="movie-turn-title">{moviePicker}</div>
        </div>
        <div className="turn-row">
          <span>🐾</span>
          <div className="movie-turn-title">{dogFeeder}</div>
        </div>
      </div>
    </div>
  )
}
