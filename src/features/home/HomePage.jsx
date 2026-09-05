import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, ShoppingBasket, UtensilsCrossed, CalendarDays } from 'lucide-react'
import { useEvents } from '../../state/EventsContext.jsx'
import { useMeals } from '../../state/MealsContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { useGrocery } from '../../state/GroceryContext.jsx'
import { useKidPoints } from '../../state/KidPointsContext.jsx'
import { useScreenTime } from '../../state/ScreenTimeContext.jsx'
import { todayStr, formatTime, KIDS, KID_EMOJI } from '../../lib/family.js'
import { dayLabel, workItems, shiftDate } from '../../lib/planning.js'
import { pendingItems } from '../kids/kidsUtils.js'
import { useTick } from '../kids/useTick.js'
import WorkRow from '../planning/WorkRow.jsx'
import WorkEditModal from '../planning/WorkEditModal.jsx'
import EventModal from '../planner/EventModal.jsx'
import PlanDinnerModal from '../meals/PlanDinnerModal.jsx'
import TurnControls from '../planning/TurnControls.jsx'
import Notice, { useNotice } from '../../components/Notice.jsx'
import QuickCapture from './QuickCapture.jsx'
import './home.css'

export default function HomePage() {
  useTick(60_000)
  const events = useEvents(), meals = useMeals(), tasks = useTodos(), chores = useChores(), grocery = useGrocery()
  const { kidPoints } = useKidPoints(), { requests } = useScreenTime()
  const [modal, setModal] = useState(null)
  const [notice, showNotice] = useNotice()
  const today = todayStr()
  const scheduled = events.events.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const tomorrow = events.events.filter(e => e.date === shiftDate(today, 1)).length
  const allWork = workItems(tasks.todos, chores.chores, today)
  const due = allWork.filter(item => !item.done && item.date && item.date <= today).sort((a,b) => a.date.localeCompare(b.date))
  const groceryCount = grocery.items.filter(i => !i.checked).length
  const waiting = pendingItems(kidPoints, requests).length
  const error = [events, meals, tasks, chores, grocery].find(s => s.error)?.error
  const loading = [events, meals, tasks, chores, grocery].some(s => s.loading)
  return <div className="page page-enter home-page">
    <Notice notice={notice} />
    <header className="home-heading"><div><p>{dayLabel(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>Here’s your day.</h1></div><Link to="/plan" className="btn">Plan the week <ArrowRight size={18} /></Link></header>
    <QuickCapture />
    {error && <p className="workspace-status" role="alert">{error}</p>}
    {loading && !error && <p className="workspace-status" role="status">Bringing your family’s day together…</p>}
    <div className="home-layout">
      <div className="home-main-column">
        <section className="home-section today-agenda"><div className="home-section-heading"><h2>Today’s plans</h2><button className="btn btn-ghost" onClick={() => setModal({ type: 'event', value: { date: today } })}><Plus size={17} /> Add event</button></div>
          {!loading && !error && !scheduled.length && <div className="home-empty"><CalendarDays size={28} /><p>No events today.<small>Leave some room, or add a plan above.</small></p></div>}
          {scheduled.slice(0, 4).map(event => <button key={event.id} className="home-event" onClick={() => setModal({ type: 'event', value: event })}><time>{event.time ? formatTime(event.time) : 'All day'}</time><span><strong>{event.title}</strong><small>{[event.location, ...(event.who || [])].filter(Boolean).join(' · ') || 'Everyone'}</small></span><ArrowRight size={17} /></button>)}
          <Link className="home-text-link" to={'/plan?date=' + today}>{scheduled.length > 4 ? `See all ${scheduled.length} events today` : tomorrow ? `${tomorrow} ${tomorrow === 1 ? 'plan' : 'plans'} tomorrow · Open calendar` : 'Look ahead in your calendar'}<ArrowRight size={16} /></Link>
        </section>
        <section className="home-section"><div className="home-section-heading"><h2>Needs doing</h2><Link className="btn btn-ghost" to="/lists?view=today">See all{due.length ? ` (${due.length})` : ''} <ArrowRight size={17} /></Link></div>
          {!loading && !error && !due.length && <p className="empty-inline">Nothing due. The rest of your to-dos are waiting in Lists.</p>}
          {due.slice(0, 4).map(item => <WorkRow key={item.kind + item.id} item={item} onEdit={value => setModal({ type: 'work', value })} showNotice={showNotice} />)}
          <Link className="home-text-link" to="/lists">All to-dos, including things without a date <ArrowRight size={16} /></Link>
        </section>
      </div>
      <aside className="home-side-column">
        <section className="dinner-note"><span className="note-icon"><UtensilsCrossed size={24} /></span><h2>What’s for dinner?</h2><p>{meals.meals[today]?.recipeName || 'Still room for a plan.'}</p><button className="btn" disabled={meals.loading || !!meals.error} onClick={() => setModal({ type: 'dinner' })}>{meals.meals[today] ? 'View dinner' : 'Choose dinner'}<ArrowRight size={17} /></button></section>
        <Link className="grocery-shortcut" to="/lists/groceries"><ShoppingBasket size={25} /><span><strong>Grocery list</strong><small>{grocery.loading ? 'Loading…' : grocery.error ? 'Open your list' : `${groceryCount} ${groceryCount === 1 ? 'item' : 'items'} to pick up`}</small></span><ArrowRight size={18} /></Link>
        <section className="home-kids"><div className="home-section-heading"><h2>The kids</h2><Link to="/kids" className="btn btn-ghost" aria-label="Open kids spaces"><ArrowRight size={18} /></Link></div>{KIDS.map(kid => <Link key={kid} to={'/kids?kid=' + kid}><span className="home-kid-avatar">{KID_EMOJI[kid]}</span><strong>{kid}</strong><ArrowRight size={16} /></Link>)}</section>
        {waiting > 0 && <Link className="home-request" to="/parent?open=pending">{waiting} {waiting === 1 ? 'request needs' : 'requests need'} a parent <ArrowRight size={18} /></Link>}
      </aside>
    </div>
    <details className="home-turns"><summary>Whose turn is it?</summary><TurnControls showNotice={showNotice} /></details>
    {modal?.type === 'event' && <EventModal event={modal.value} onClose={() => setModal(null)} showNotice={showNotice} />}
    {modal?.type === 'work' && <WorkEditModal item={modal.value} onClose={() => setModal(null)} showNotice={showNotice} />}
    {modal?.type === 'dinner' && <PlanDinnerModal dateKey={today} onClose={() => setModal(null)} showNotice={showNotice} />}
  </div>
}
