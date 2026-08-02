// Home / dashboard — port of the old public/index.html + index.js. Same
// data, same layout, same "whose turn" inline-confirm interaction; just
// React + the new design system underneath.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clapperboard, PawPrint, MapPin } from 'lucide-react'
import { useMeals } from '../../state/MealsContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { useEvents } from '../../state/EventsContext.jsx'
import { useGrocery } from '../../state/GroceryContext.jsx'
import { useTurns } from '../../state/TurnsContext.jsx'
import Notice, { useNotice } from '../../components/Notice.jsx'
import { DAYS, KIDS, KID_DEFAULT_STATUS, KID_EMOJI, todayStr, greeting, formatTime } from '../../lib/family.js'
import './dashboard.css'

export default function DashboardPage() {
  const { meals } = useMeals()
  const { todos } = useTodos()
  const { chores } = useChores()
  const { events } = useEvents()
  const grocery = useGrocery()
  const turns = useTurns()
  const [notice, showNotice] = useNotice()

  // Ticks once a minute so the greeting ("Good morning" → "Good afternoon")
  // and the "today" key roll over without a page reload.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const todayKey = todayStr()
  const dayName = DAYS[now.getDay()]
  const todayMeal = meals[todayKey]

  const openTasks = useMemo(
    () => todos.filter((t) => !t.done && t.dueDate === todayKey),
    [todos, todayKey],
  )
  const choresToday = useMemo(() => chores.filter((c) => c.day === dayName), [chores, dayName])
  const openChores = useMemo(() => choresToday.filter((c) => !c.done), [choresToday])
  const groceryItems = Array.isArray(grocery.items) ? grocery.items : []
  const checkedCount = groceryItems.filter((i) => i.checked).length
  const groceryPct = groceryItems.length ? Math.round((checkedCount / groceryItems.length) * 100) : 0

  const todayEvents = useMemo(
    () =>
      events
        .filter((e) => e.date === todayKey)
        .sort((a, b) => {
          if (!a.time && !b.time) return 0
          if (!a.time) return 1
          if (!b.time) return -1
          return a.time.localeCompare(b.time)
        }),
    [events, todayKey],
  )

  const heroEyebrow = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Home shows at most a few events and links the rest to Planner — the full
  // day belongs on the Planner page, not stacked onto the dashboard.
  const CALENDAR_PREVIEW = 3
  const visibleEvents = todayEvents.slice(0, CALENDAR_PREVIEW)
  const moreEvents = todayEvents.length - visibleEvents.length

  async function handleAdvanceMovie() {
    try {
      const next = await turns.advanceMovieTurn()
      showNotice(`Movie turn moved to ${next}.`, 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't update movie turn.", 'error')
    }
  }

  async function handleAdvanceDog() {
    try {
      const next = await turns.advanceDogTurn()
      showNotice(`Dog-feeding turn moved to ${next}.`, 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't update dog-feeding turn.", 'error')
    }
  }

  return (
    <div className="page page-enter" data-page="home">
      <Notice notice={notice} />

      <div className="dash-hero">
        <div>
          <div className="dash-eyebrow">{heroEyebrow}</div>
          <h1 className="dash-greeting">{greeting(now)}</h1>
        </div>
        <div className="dash-dinner">
          <div className="dash-dinner-label">Tonight&rsquo;s Dinner</div>
          <div className={`dash-dinner-name${todayMeal ? '' : ' empty'}`}>
            {todayMeal ? todayMeal.recipeName : 'Nothing planned'}
          </div>
        </div>
      </div>

      <div className="dash-stats-row">
        <div className="card dash-stat-tile">
          <div className="dash-stat-label">Tasks</div>
          <div className="dash-stat-value">{openTasks.length}</div>
          <div className="dash-stat-copy">
            {openTasks.length
              ? openTasks[0].text.slice(0, 26) + (openTasks[0].text.length > 26 ? '…' : '')
              : 'All clear!'}
          </div>
        </div>
        <div className="card dash-stat-tile">
          <div className="dash-stat-label">Routines</div>
          <div className="dash-stat-value">{openChores.length}</div>
          <div className="dash-stat-copy">
            {openChores.length
              ? `${choresToday.length - openChores.length} of ${choresToday.length} done`
              : choresToday.length
                ? 'All done ✓'
                : 'None due'}
          </div>
        </div>
        <div className="card dash-stat-tile">
          <div className="dash-stat-label">Groceries</div>
          <div className="dash-stat-value">
            {groceryItems.length ? `${checkedCount}/${groceryItems.length}` : '–'}
          </div>
          <div className="dash-grocery-track">
            <div className="dash-grocery-fill" style={{ width: `${groceryPct}%` }} />
          </div>
        </div>
      </div>

      {/* Nothing on today's calendar means no card at all — an empty panel
          saying "nothing" is just another block to scroll past. */}
      {todayEvents.length > 0 && (
        <div className="card dash-panel">
          <div className="panel-title">
            <CalendarDays aria-hidden="true" /> On The Calendar Today
          </div>
          <div className="dash-calendar-feed">
            {visibleEvents.map((event) => (
              <div className="dash-calendar-row" key={event.id}>
                <div className="dash-calendar-dot" style={{ background: event.color || 'var(--accent-planner)' }} />
                <div className="dash-calendar-time">{formatTime(event.time)}</div>
                <div className="dash-calendar-info">
                  <div className="dash-calendar-title">{event.title}</div>
                  {event.location && (
                    <div className="dash-calendar-meta">
                      <MapPin aria-hidden="true" size={12} /> {event.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {moreEvents > 0 && (
              <Link className="dash-calendar-more" to="/planner">
                +{moreEvents} more today
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="dash-kids-strip">
        {KIDS.map((name) => (
          <KidCard
            key={name}
            name={name}
            choresToday={choresToday}
            todos={todos}
            todayKey={todayKey}
          />
        ))}
      </div>

      <div className="card dash-panel">
        <div className="panel-title">Whose Turn</div>
        <div className="dash-turn-list">
          <TurnItem
            icon={<Clapperboard aria-hidden="true" />}
            label="Movie Night"
            current={turns.moviePicker}
            onAdvance={handleAdvanceMovie}
          />
          <TurnItem
            icon={<PawPrint aria-hidden="true" />}
            label="Dog Feeding"
            current={turns.dogFeeder}
            onAdvance={handleAdvanceDog}
          />
        </div>
      </div>
    </div>
  )
}

function KidCard({ name, choresToday, todos, todayKey }) {
  const kidChores = choresToday.filter((c) => c.assignee === name)
  const kidDone = kidChores.filter((c) => c.done).length
  const dueTodayTasks = todos
    .filter((t) => !t.done && t.assignee === name && t.dueDate === todayKey)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

  const status = kidChores.length
    ? kidDone === kidChores.length
      ? 'All done ✓'
      : `${kidDone}/${kidChores.length} chores`
    : KID_DEFAULT_STATUS[name] || ''
  const statusDone = kidChores.length > 0 && kidDone === kidChores.length

  // Card shows a count, not the task text — the list itself lives on the
  // kid's own page, one tap away, instead of being mirrored here.
  const taskCount = dueTodayTasks.length

  return (
    <Link
      className="dash-kid-card"
      to={`/kids?kid=${encodeURIComponent(name)}`}
      aria-label={`${name}. ${status}. ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} due today.`}
    >
      <span className="dash-kid-emoji" aria-hidden="true">{KID_EMOJI[name] || '🧒'}</span>
      <div className="dash-kid-copy">
        <div className="dash-kid-name">{name}</div>
        <div className="dash-kid-status" data-done={statusDone}>{status}</div>
        {taskCount > 0 && (
          <div className="dash-kid-tasks">
            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
          </div>
        )}
      </div>
    </Link>
  )
}

function TurnItem({ icon, label, current, onAdvance }) {
  const [pending, setPending] = useState(false)

  async function confirm() {
    setPending(false)
    await onAdvance()
  }

  return (
    <div>
      <button
        type="button"
        className="dash-turn-item"
        onClick={() => !pending && setPending(true)}
      >
        <span className="dash-turn-icon">{icon}</span>
        <span className="dash-turn-label">{label}</span>
        <span className="dash-turn-name">{current}</span>
        <span className="dash-turn-arrow">›</span>
      </button>
      {pending && (
        <div className="dash-inline-confirm">
          <span className="dash-inline-confirm-label">Mark {current}&rsquo;s turn done?</span>
          <button type="button" className="dash-inline-confirm-yes" onClick={confirm}>
            Yes, move it
          </button>
          <button type="button" className="dash-inline-confirm-no" onClick={() => setPending(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
