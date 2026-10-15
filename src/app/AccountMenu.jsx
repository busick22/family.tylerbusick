// Account and device-theme controls shared by the tablet and phone header.

import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, LogOut, CircleHelp } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useSettings } from '../state/SettingsContext.jsx'

export default function AccountMenu({ onHelp }) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useSettings()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className="account-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {user?.photoURL ? (
          <img className="avatar" src={user.photoURL} alt="" />
        ) : (
          <span className="avatar account-initial">{(user?.displayName || 'Family').slice(0, 1)}</span>
        )}
      </button>
      {open && (
        <div className="menu account-dropdown" role="menu">
          {onHelp && (
            <button
              type="button"
              className="menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onHelp()
              }}
            >
              <CircleHelp aria-hidden="true" />
              Help
            </button>
          )}
          <button type="button" className="menu-item" role="menuitem" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" className="menu-item" role="menuitem" data-danger="true" onClick={signOut}>
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
