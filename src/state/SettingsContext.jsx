// Device preferences — just the theme for now. Unlike the sibling apps this
// is NOT stored per-user in Firestore: the whole family shares one tablet
// and one signed-in account, so "theme" is a property of the device, not
// the person. localStorage is the right (and simplest) home for it.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const SettingsContext = createContext(null)

const DEFAULTS = {
  theme: 'light', // 'light' | 'dark'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('family:theme', theme)
  } catch {
    /* ignore */
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    let theme = DEFAULTS.theme
    try {
      theme = localStorage.getItem('family:theme') || DEFAULTS.theme
    } catch {
      /* ignore */
    }
    return { ...DEFAULTS, theme }
  })

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const value = useMemo(
    () => ({
      ...settings,
      toggleTheme() {
        setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
      },
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
