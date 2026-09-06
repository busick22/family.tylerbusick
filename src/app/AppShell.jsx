import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Plus, Settings, CircleHelp, X, ArrowRight } from 'lucide-react'
import BottomNav from './BottomNav.jsx'
import AccountMenu from './AccountMenu.jsx'
import { BrandMark, BrandWordmark } from './Brand.jsx'
import { NAV_ITEMS } from './nav.js'
import Modal from '../components/Modal.jsx'
import CaptureMenu from './CaptureMenu.jsx'
import './shell.css'
import '../features/planning/planning.css'
import './home-shell.css'

export default function AppShell() {
  const [adding, setAdding] = useState(false)
  const [help, setHelp] = useState(false)
  const { pathname } = useLocation()
  const place = NAV_ITEMS.find(item => item.to !== '/' && pathname.startsWith(item.to))?.label || (pathname === '/parent' ? 'Family settings' : 'Home')
  return <div className="shell planning-shell home-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="family-rail">
      <Link to="/" className="family-brand" aria-label="Family home"><BrandMark size={32} /><BrandWordmark /></Link>
      <button className="btn btn-primary family-add" onClick={() => setAdding(true)}><Plus size={20} aria-hidden="true" /> Add something</button>
      <nav className="family-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={22} aria-hidden="true" /><strong>{label}</strong></NavLink>)}
      </nav>
      <div className="family-rail-bottom">
        <button className="rail-utility" onClick={() => setHelp(true)}><CircleHelp size={19} aria-hidden="true" /> Help</button>
        <NavLink to="/parent" className="rail-utility"><Settings size={19} aria-hidden="true" /> Family settings</NavLink>
      </div>
    </aside>
    <div className="family-body">
      <header className="family-topbar">
        <Link to="/" className="mobile-brand" aria-label="Family home"><BrandMark size={25} /><BrandWordmark /></Link>
        <span className="family-location">{place}</span>
        <div className="family-topbar-actions">
          <button className="btn btn-ghost mobile-add" onClick={() => setAdding(true)} aria-label="Add something"><Plus size={20} /> Add</button>
          <Link to="/parent" className="icon-btn mobile-settings" aria-label="Family settings"><Settings size={20} /></Link>
          <AccountMenu onHelp={() => setHelp(true)} />
        </div>
      </header>
      <main id="main-content" className="shell-main" tabIndex={-1}><Outlet key={pathname} /></main>
    </div>
    <BottomNav />
    {adding && <CaptureMenu onClose={() => setAdding(false)} />}
    {help && <Modal onClose={() => setHelp(false)}><button className="icon-btn modal-close" onClick={() => setHelp(false)} aria-label="Close"><X /></button><h2>Where things are</h2><nav className="wayfinding" aria-label="Find a feature">{NAV_ITEMS.map(({ to, label, help: description, icon: Icon }) => <Link to={to} key={to} onClick={() => setHelp(false)}><Icon size={22} /><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={18} /></Link>)}<Link to="/parent" onClick={() => setHelp(false)}><Settings size={22} /><span><strong>Family settings</strong><small>Members, requests, points, and screen time</small></span><ArrowRight size={18} /></Link></nav></Modal>}
  </div>
}
