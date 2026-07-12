// The four areas. Each gets its own accent color, applied to the page via
// the --page-accent CSS variable (see AppShell) — mirrors the old
// btn-nav / mobile-bottom-nav pages exactly (Home, Meals, Planner, Kids).

import { Home, UtensilsCrossed, CalendarDays, Users } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, accent: 'var(--accent-home)' },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'var(--accent-meals)' },
  { to: '/planner', label: 'Planner', icon: CalendarDays, accent: 'var(--accent-planner)' },
  { to: '/kids', label: 'Kids', icon: Users, accent: 'var(--accent-kids)' },
]
