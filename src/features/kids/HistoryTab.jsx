// A kid's History tab: the last two weeks of completed chores/tasks (with
// points earned), missed chores they can still knock out, and a peek at
// next week's chores.

import { useChores } from '../../state/ChoresContext.jsx'
import { useKidPoints } from '../../state/KidPointsContext.jsx'
import { DAYS, todayStr } from '../../lib/family.js'
import { useKidActions } from './useKidActions.js'

function dateKeyFromOffset(offsetDays) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HistoryTab({ kid }) {
  const { chores } = useChores()
  const { kidPoints, deleteHistoryEntry } = useKidPoints()
  const actions = useKidActions(kid)

  const data = kidPoints[kid] || { history: [], redeemed: [] }
  const historyEntries = data.history || []
  const today = todayStr()

  const days = []
  for (let i = -13; i <= 6; i++) days.push(dateKeyFromOffset(i))
  const pastDays = days.filter((d) => d <= today).reverse()
  const futureDays = days.filter((d) => d > today)

  const upcomingGroups = futureDays
    .map((dateKey) => {
      const d = new Date(`${dateKey}T12:00`)
      const dayOfWeek = DAYS[d.getDay()]
      const dayChores = chores.filter((c) => c.assignee === kid && c.day === dayOfWeek)
      return { dateKey, dayChores, label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
    })
    .filter((g) => g.dayChores.length)

  const pastGroups = pastDays
    .map((dateKey) => {
      const d = new Date(`${dateKey}T12:00`)
      const isToday = dateKey === today
      const dayOfWeek = DAYS[d.getDay()]
      const dayHistory = historyEntries.map((e, idx) => ({ ...e, _idx: idx })).filter((e) => e.date === dateKey)
      const dayChores = chores.filter((c) => c.assignee === kid && c.day === dayOfWeek)
      const completedRefIds = new Set(dayHistory.filter((e) => e.type === 'chore').map((e) => e.refId))
      const missedChores = isToday ? [] : dayChores.filter((c) => !completedRefIds.has(c.id) && !c.done && dateKey < today)
      return {
        dateKey,
        isToday,
        label: isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        dayHistory,
        missedChores,
        dayPts: dayHistory.reduce((s, e) => s + (e.points || 0), 0),
      }
    })
    .filter((g) => g.dayHistory.length || g.missedChores.length)

  const isEmpty = !upcomingGroups.length && !pastGroups.length

  return (
    <div>
      {isEmpty && <div className="k-empty">No history yet — complete some tasks!</div>}

      {upcomingGroups.length > 0 && (
        <div className="hist-day">
          <div className="hist-day-hdr">📅 Upcoming</div>
          {upcomingGroups.map((g) => (
            <div key={g.dateKey} style={{ marginBottom: '0.5rem' }}>
              <div className="hist-day-hdr hist-day-hdr-sm">{g.label}</div>
              {g.dayChores.map((c) => (
                <div className="hist-item hist-upcoming" key={c.id}>
                  <span className="hist-status">⏳</span>
                  <span className="hist-name">{c.name}</span>
                  {c.points ? <span className="hist-pts">{c.points}pts</span> : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {pastGroups.map((g) => (
        <div className="hist-day" key={g.dateKey}>
          <div className={`hist-day-hdr ${g.isToday ? 'today-hdr' : ''}`}>
            {g.label}
            {g.dayPts > 0 && <span className="hist-day-pts">+{g.dayPts} pts</span>}
          </div>
          {g.dayHistory.map((e) => (
            <div className="hist-item" key={e._idx}>
              <span className="hist-status">✅</span>
              <span className="hist-name">{e.label}</span>
              {e.points ? <span className="hist-pts">+{e.points}pts</span> : null}
              <button
                className="hist-del"
                onClick={() => deleteHistoryEntry(kid, e._idx, e)}
                aria-label={`Remove ${e.label}`}
              >
                ✕
              </button>
            </div>
          ))}
          {g.missedChores.map((c) => (
            <div className="hist-item" key={c.id}>
              <span className="hist-status">❌</span>
              <span className="hist-name hist-missed">{c.name}</span>
              {c.points ? <span className="hist-pts">{c.points}pts</span> : null}
              <button className="hist-complete-btn" onClick={() => actions.completeChoreNow(c.id)}>
                Complete now
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
