import PlanNav from './PlanNav.jsx'
import { useTick } from '../kids/useTick.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, Plus, UtensilsCrossed } from 'lucide-react'
import { useEvents } from '../../state/EventsContext.jsx'
import { useMeals } from '../../state/MealsContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { DAYS, formatTime, todayStr } from '../../lib/family.js'
import { dayLabel, weekDates } from '../../lib/planning.js'
import EventModal from './EventModal.jsx'
import PlanDinnerModal from '../meals/PlanDinnerModal.jsx'
import WorkEditModal from './WorkEditModal.jsx'
import WorkRow from './WorkRow.jsx'
import WeekPicker from './WeekPicker.jsx'
import { usePlanDate } from './usePlanDate.js'
import './planning.css'

export default function WeekPage() {
  useTick(60_000)
  const eventState = useEvents()
  const mealState = useMeals()
  const taskState = useTodos()
  const choreState = useChores()
  const { events } = eventState
  const { meals } = mealState
  const { todos } = taskState
  const { chores } = choreState
  const [date, setDate] = usePlanDate()
  const [modal, setModal] = useState(null)
  const dates = weekDates(date)
  const today = todayStr()
  const dayEvents = events
    .filter((e) => e.date === date)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const dayTasks = todos.filter((t) => t.dueDate === date)
  const dayChores = chores.filter((c) => c.day === DAYS[new Date(date + 'T12:00:00').getDay()])
  const dayWork = [
    ...dayTasks.map((t) => ({ ...t, kind: 'task', title: t.text, date: t.dueDate || null })),
    ...dayChores.map((c) => ({ ...c, kind: 'chore', title: c.name, date })),
  ].sort(
    (a, b) =>
      Number(Boolean(a.done)) - Number(Boolean(b.done)) || (a.title || '').localeCompare(b.title || ''),
  )
  const states = [eventState, mealState, taskState, choreState]
  const loading = states.some((state) => state.loading)
  const error = states.find((state) => state.error)?.error

  return (
    <div className="page page-enter">
      <header className="workspace-title">
        <h1>Plan</h1>
        <WeekPicker date={date} onChange={setDate} />
      </header>
      <PlanNav />
      {error && (
        <p className="workspace-status" role="alert">
          {error}
        </p>
      )}
      {loading && !error && (
        <p className="workspace-status" role="status">
          Loading plans…
        </p>
      )}
      <div className="workspace-split">
        <div className="week-column">
          <section className="workspace-surface week-surface" aria-label="Week overview">
            <div className="surface-heading">
              <h2>
                {dayLabel(dates[0], { month: 'short', day: 'numeric' })} –{' '}
                {dayLabel(dates[6], { month: 'short', day: 'numeric' })}
              </h2>
            </div>
            {dates.map((key) => {
              const scheduled = events
                .filter((e) => e.date === key)
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              return (
                <button
                  key={key}
                  className="week-day-row"
                  data-today={key === today}
                  data-selected={key === date}
                  aria-pressed={key === date}
                  aria-label={dayLabel(key)}
                  onClick={() => setDate(key)}
                >
                  <span className="week-date">
                    {dayLabel(key, { weekday: 'short' })}
                    <strong>{Number(key.slice(-2))}</strong>
                  </span>
                  <span className="week-row-copy">
                    <strong>{scheduled.length ? scheduled[0].title : 'No events planned'}</strong>
                    <small>{meals[key]?.recipeName || 'Dinner not planned'}</small>
                  </span>
                  <span className="week-row-count">
                    {scheduled.length > 1
                      ? '+' + (scheduled.length - 1) + ' more'
                      : key === today
                        ? 'Today'
                        : ''}
                  </span>
                </button>
              )
            })}
          </section>
        </div>
        <section className="workspace-surface day-detail" aria-label="Selected day">
          <h2>{dayLabel(date)}</h2>
          <div className="section-heading">
            <h2>Schedule</h2>
            <button className="btn btn-ghost" onClick={() => setModal({ type: 'event', value: { date } })}>
              <Plus size={16} aria-hidden="true" /> Event
            </button>
          </div>
          {!loading && !error && !dayEvents.length && <p className="empty-inline">Nothing scheduled.</p>}
          {dayEvents.map((event) => (
            <button
              className="agenda-row"
              key={event.id}
              onClick={() => setModal({ type: 'event', value: event })}
            >
              <CalendarDays size={18} aria-hidden="true" />
              <span>
                <strong>{event.title}</strong>
                <small>
                  {[event.time ? formatTime(event.time) : 'All day', event.location, ...(event.who || [])]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ))}
          <div className="section-heading">
            <h2>Dinner</h2>
          </div>
          <button className="agenda-row" onClick={() => setModal({ type: 'dinner' })}>
            <UtensilsCrossed size={18} aria-hidden="true" />
            <span>
              <strong>{meals[date]?.recipeName || 'Plan dinner'}</strong>
              <small>{meals[date] ? 'View or change the plan' : 'A recipe, leftovers, or eating out'}</small>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
          <div className="section-heading">
            <h2>To-dos</h2>
            <button className="btn btn-ghost" onClick={() => setModal({ type: 'work', value: { date } })}>
              <Plus size={16} aria-hidden="true" /> To-do
            </button>
          </div>
          {!loading && !error && !dayWork.length && (
            <p className="empty-inline">Nothing assigned to this day.</p>
          )}
          {dayWork.map((item) => (
            <WorkRow
              key={item.kind + item.id}
              item={item}
              onEdit={(value) => setModal({ type: 'work', value })}
            />
          ))}
          <div className="workspace-footer-links">
            <Link to="/lists">See all to-dos, including overdue →</Link>
          </div>
        </section>
      </div>
      {modal?.type === 'event' && <EventModal event={modal.value} onClose={() => setModal(null)} />}
      {modal?.type === 'dinner' && <PlanDinnerModal dateKey={date} onClose={() => setModal(null)} />}
      {modal?.type === 'work' && <WorkEditModal item={modal.value} onClose={() => setModal(null)} />}
    </div>
  )
}
