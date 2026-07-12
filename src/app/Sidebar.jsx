import { NavLink } from 'react-router-dom'
import { Sun, Moon, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV_ITEMS } from './nav.js'
import { BrandMark, BrandWordmark } from './Brand.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useSettings } from '../state/SettingsContext.jsx'

export default function Sidebar({ collapsed, onToggle }) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useSettings()

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-head">
        <BrandMark />
        {!collapsed && <BrandWordmark />}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, accent }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="sidebar-link"
            style={{ '--item-accent': accent }}
            title={collapsed ? label : undefined}
          >
            <Icon aria-hidden="true" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        {user && !collapsed && (
          <div className="sidebar-user">
            {user.photoURL ? (
              <img className="avatar" src={user.photoURL} alt="" />
            ) : (
              <div className="avatar" />
            )}
            <span className="sidebar-user-name">{user.displayName?.split(' ')[0] || 'Friend'}</span>
          </div>
        )}
        <button
          className="sidebar-link"
          onClick={toggleTheme}
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          className="sidebar-link"
          onClick={signOut}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut aria-hidden="true" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          className="sidebar-link sidebar-collapse"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
