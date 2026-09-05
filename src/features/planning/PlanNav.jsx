import { NavLink, useSearchParams } from 'react-router-dom'
import { CalendarDays, CalendarRange } from 'lucide-react'
export default function PlanNav() {
  const [params] = useSearchParams()
  const date = params.get('date')
  const query = date ? '?date=' + encodeURIComponent(date) : ''
  return <nav className="section-nav" aria-label="Calendar views"><NavLink to={'/plan' + query} end><CalendarRange size={18} />Week</NavLink><NavLink to={'/plan/month' + query}><CalendarDays size={18} />Month</NavLink></nav>
}
