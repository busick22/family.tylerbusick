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
  const [params, setParams] = useSearchParams()
  const month = params.get('view') === 'month'
  return <>
    {error && <p className="workspace-status" role="alert">{error}</p>}
    {loading && <p className="workspace-status" role="status">Loading your meal plan…</p>}
    {month ? <ScheduleTab monthOnly showNotice={showNotice} onPickDay={key => setParams(previous => { const next = new URLSearchParams(previous); next.set('date', key); next.delete('view'); return next })} /> : <div className="workspace-split">
      <section className="workspace-surface week-surface" aria-label="Weekly dinners">
        <div className="surface-heading"><h2>{dayLabel(dates[0], { month: 'short', day: 'numeric' })} – {dayLabel(dates[6], { month: 'short', day: 'numeric' })}</h2><WeekPicker date={date} onChange={setDate} /></div>
        {dates.map(key => <button key={key} className="week-day-row" data-today={key === todayStr()} data-selected={key === date} aria-pressed={key === date} aria-label={'Plan dinner for ' + dayLabel(key)} onClick={() => setDate(key)}>
          <span className="week-date">{dayLabel(key, { weekday: 'short' })}<strong>{Number(key.slice(-2))}</strong></span>
          <span className="week-row-copy"><strong>{meals[key]?.recipeName || 'Plan dinner'}</strong><small>{meals[key] ? meals[key].recipeId ? 'Saved recipe' : 'Simple plan' : 'Choose a recipe or write something in'}</small></span>
        </button>)}
        <div className="surface-heading"><Link className="btn btn-ghost" to="/meals?tab=grocery">Add ingredients to groceries →</Link></div>
      </section>
      <PlanDinnerModal key={date + (meals[date]?.recipeName || '') + (meals[date]?.recipeId || '')} dateKey={date} inline showNotice={showNotice} onCook={onCook} />
    </div>}
  </>
}
