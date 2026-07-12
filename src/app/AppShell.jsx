// The signed-in frame: desktop gets a collapsible sidebar, mobile gets a
// top bar (brand + account) plus a bottom tab bar. Which shows is pure CSS
// (media queries) — everything is always rendered, so there's no resize
// flicker.

import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import AccountMenu from './AccountMenu.jsx'
import { BrandMark, BrandWordmark } from './Brand.jsx'
import { NAV_ITEMS } from './nav.js'
import './shell.css'

export default function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('family:sidebar') === 'collapsed'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('family:sidebar', collapsed ? 'collapsed' : 'open')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const active = NAV_ITEMS.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  )
  const pageAccent = active?.accent ?? 'var(--accent)'

  return (
    <div className="shell" data-collapsed={collapsed}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="shell-mobile-top">
        <div className="shell-mobile-brand">
          <BrandMark size={24} />
          <BrandWordmark />
        </div>
        <AccountMenu />
      </div>
      <main className="shell-main" style={{ '--page-accent': pageAccent }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
