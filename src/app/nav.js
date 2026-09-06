import { House, CalendarDays, ListChecks, UtensilsCrossed, Users } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', help: 'Today’s schedule and what needs doing', icon: House },
  { to: '/plan', label: 'Plan', help: 'Week and month calendar', icon: CalendarDays },
  { to: '/lists', label: 'Lists', help: 'To-dos and groceries', icon: ListChecks },
  { to: '/meals', label: 'Meals', help: 'Dinner plan and recipes', icon: UtensilsCrossed },
  { to: '/kids', label: 'Kids', help: 'Chores, screen time, points, and wish lists', icon: Users },
]
