import { Link, NavLink, Outlet } from 'react-router-dom'
import { Settings } from 'lucide-react'
import BottomNav from './BottomNav.jsx'
import AccountMenu from './AccountMenu.jsx'
import { BrandMark, BrandWordmark } from './Brand.jsx'
import { NAV_ITEMS } from './nav.js'
import './shell.css'
import '../features/planning/planning.css'

export default function AppShell() {
  return <div className="shell planning-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="workspace-bar">
      <Link to="/" className="workspace-brand" aria-label="Family week"><BrandMark size={28} /><BrandWordmark /></Link>
      <nav className="workspace-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={19} aria-hidden="true" />{label}</NavLink>)}
      </nav>
      <div className="workspace-account">
        <NavLink to="/parent" className="parent-link"><Settings size={18} aria-hidden="true" /><span>Parent</span></NavLink>
        <AccountMenu />
      </div>
    </header>
    <main id="main-content" className="shell-main" tabIndex={-1}><Outlet /></main>
    <BottomNav />
  </div>
}
