import { House, CalendarDays, ListChecks, UtensilsCrossed, Users } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', detail: 'Today, at a glance', icon: House },
  { to: '/plan', label: 'Plan', detail: 'The family calendar', icon: CalendarDays },
  { to: '/lists', label: 'Lists', detail: 'To-dos & groceries', icon: ListChecks },
  { to: '/meals', label: 'Meals', detail: 'Dinners & recipes', icon: UtensilsCrossed },
  { to: '/kids', label: 'Kids', detail: 'Chores, time & wishes', icon: Users },
]
