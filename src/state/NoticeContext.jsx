// The app's single toast. Every screen used to own a `useNotice()` pair and
// render its own <Notice>, then thread `showNotice` down through every child
// that might need it — modals, rows, tabs. Because `.page-notice` is
// position:fixed, all of those copies drew at the same spot and only one was
// ever visible, so the plumbing bought nothing.
//
// Now one provider owns the state and renders one host. `useNotice()` returns
// the `showNotice` function directly; nothing has to be passed as a prop.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const NoticeContext = createContext(() => {})

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const showNotice = useCallback((message, type = 'info', duration = 3200) => {
    clearTimeout(timer.current)
    setNotice({ message, type })
    timer.current = setTimeout(() => setNotice(null), duration)
  }, [])

  return (
    <NoticeContext.Provider value={showNotice}>
      {notice && (
        <div className={`page-notice page-notice-${notice.type}`} role="status" aria-live="polite">
          {notice.message}
        </div>
      )}
      {children}
    </NoticeContext.Provider>
  )
}

export function useNotice() {
  return useContext(NoticeContext)
}
