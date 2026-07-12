// Forces a re-render every `ms` — used by anything that shows a live
// countdown derived from wall-clock time (screen-time timers).

import { useEffect, useState } from 'react'

export function useTick(ms = 1000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}
