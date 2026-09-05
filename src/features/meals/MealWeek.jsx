import { useState } from 'react'
import { ArrowRight, Plus, UtensilsCrossed } from 'lucide-react'
import { useTick } from '../kids/useTick.js'
import { Link, useSearchParams } from 'react-router-dom'
import { useMeals } from '../../state/MealsContext.jsx'
import { dayLabel, weekDates } from '../../lib/planning.js'
import { todayStr } from '../../lib/family.js'
import { usePlanDate } from '../planning/usePlanDate.js'
import WeekPicker from '../planning/WeekPicker.jsx'
import PlanDinnerModal from './PlanDinnerModal.jsx'
import ScheduleTab from './ScheduleTab.jsx'

export default function MealWeek({ showNotice, onCook }) {
  useTick(60_000)
  const { meals, loading, error } = useMeals()
  const [date, setDate] = usePlanDate()
  const dates = weekDates(date)
  const [editingDate, setEditingDate] = useState(null)
  const [params, setParams] = useSearchParams()
  const month = params.get('view') === 'month'
  return <>
    {error && <p className="workspace-status" role="alert">{error}</p>}
    {loading && <p className="workspace-status" role="status">Loading your meal plan…</p>}
    {month && <button className="btn meal-month-back" onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete('view'); return next })}>Back to dinner week</button>}
    {month ? <ScheduleTab monthOnly showNotice={showNotice} onPickDay={key => setParams(previous => { const next = new URLSearchParams(previous); next.set('date', key); next.delete('view'); return next })} /> : <section className="dinner-week" aria-label="Weekly dinners">
      <div className="dinner-week-heading"><div><h2>{dayLabel(dates[0], { month: 'short', day: 'numeric' })} – {dayLabel(dates[6], { month: 'short', day: 'numeric' })}</h2></div><WeekPicker date={date} onChange={setDate} /></div>
      <div className="dinner-days">{dates.map(key => <button key={key} className="dinner-day" data-today={key === todayStr()} onClick={() => setEditingDate(key)} aria-label={'Plan dinner for ' + dayLabel(key)}>
        <span className="dinner-date"><strong>{dayLabel(key, { weekday: 'short' })}</strong><small>{Number(key.slice(-2))}</small></span>
        <span className="dinner-day-copy"><strong>{meals[key]?.recipeName || 'Choose dinner'}</strong><small>{key === todayStr() ? 'Tonight' : meals[key] ? meals[key].recipeId ? 'From your recipe book' : 'Dinner is planned' : 'Recipe, leftovers, or eating out'}</small></span>
        {meals[key] ? <ArrowRight size={20} /> : <Plus size={20} />}
      </button>)}</div>
      <button className="btn btn-ghost meal-month-back" onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('view', 'month'); return next })}>View the full month</button>
      <Link className="dinner-shop-link" to="/lists/groceries"><UtensilsCrossed size={20} /><span><strong>Turn your meal plan into a grocery list</strong><small>Choose your dinners and add the ingredients you need.</small></span><ArrowRight size={20} /></Link>
    </section>}
    {editingDate && <PlanDinnerModal dateKey={editingDate} onClose={() => setEditingDate(null)} showNotice={showNotice} onCook={id => { setEditingDate(null); onCook(id) }} />}

  </>
}
