import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav.js'

export default function BottomNav() {
  return (
    <nav className="bottomnav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="bottomnav-link">
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
