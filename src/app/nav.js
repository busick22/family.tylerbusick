// The same five working destinations on tablet and phone.

import { CalendarRange, UtensilsCrossed, CalendarDays, Users, ListChecks } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Week', icon: CalendarRange, accent: 'var(--accent)' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, accent: 'var(--accent)' },
  { to: '/tasks', label: 'To-dos', icon: ListChecks, accent: 'var(--accent)' },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'var(--accent-meals)' },
  { to: '/kids', label: 'Kids', icon: Users, accent: 'var(--accent-kids)' },
]
