// The screen-time countdown a kid sees on their Today tab: live remaining
// time, start/pause, and a link to ask a parent for more.

import { useEffect, useRef } from 'react'
import { useScreenTime } from '../../state/ScreenTimeContext.jsx'
import { formatMs } from '../../lib/family.js'
import { useTick } from './useTick.js'

export default function TimerCard({ kid, onAskMore }) {
  const { viewFor, toggleSession, ensureDailyReset, expireSession } = useScreenTime()
  useTick(500)
  const alarmFiredRef = useRef(false)

  const view = viewFor(kid)
  const remaining = Math.max(0, view.remaining)
  const expired = remaining <= 0

  useEffect(() => {
    if (view.needsReset) ensureDailyReset(kid)
  }, [view.needsReset, kid, ensureDailyReset])

  useEffect(() => {
    if (expired && view.running && !alarmFiredRef.current) {
      alarmFiredRef.current = true
      expireSession(kid)
    }
    if (!view.running) alarmFiredRef.current = false
  }, [expired, view.running, kid, expireSession])

  const budgetMin = Math.round((view.budget || 0) / 60000)
  const usedMin = Math.round(Math.min(view.budget, view.budget - remaining) / 60000)

  return (
    <div className="timer-card">
      <div className="timer-card-head">
        <span className="timer-card-label">⏰ Screen Time</span>
        <span className={`timer-card-status ${expired ? 'expired' : view.running ? 'running' : ''}`}>
          {expired ? 'Time’s up' : view.running ? 'Running' : 'Paused'}
        </span>
      </div>
      <div className={`timer-display ${expired ? 'expired' : ''}`}>{formatMs(remaining)}</div>
      <div className="timer-sub">{usedMin} of {budgetMin} min used today</div>
      <div className="timer-actions">
        <button
          type="button"
          className="btn timer-btn"
          onClick={() => toggleSession(kid)}
          disabled={expired && !view.running}
        >
          {view.running ? '⏸ Pause' : expired ? 'Time’s up' : '▶ Start'}
        </button>
        <button type="button" className="btn timer-btn-secondary" onClick={onAskMore}>
          ＋ More time
        </button>
      </div>
      {expired && (
        <div className="timer-expired-banner">
          <span>⏰</span>
          <div>Time&rsquo;s up for today! Tap &ldquo;More time&rdquo; to ask a parent.</div>
        </div>
      )}
    </div>
  )
}
