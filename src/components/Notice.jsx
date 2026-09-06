// A small toast for confirming or flagging an action — the React version of
// the old .page-notice element. Each page owns one via useNotice().

import { useCallback, useEffect, useRef, useState } from 'react'

export function useNotice() {
  const [notice, setNotice] = useState(null) // { message, type }
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const showNotice = useCallback((message, type = 'info', duration = 3200) => {
    clearTimeout(timerRef.current)
    setNotice({ message, type })
    timerRef.current = setTimeout(() => setNotice(null), duration)
  }, [])

  return [notice, showNotice]
}

export default function Notice({ notice }) {
  if (!notice) return null
  return (
    <div className={`page-notice page-notice-${notice.type}`} role="status" aria-live="polite">
      {notice.message}
    </div>
  )
}
