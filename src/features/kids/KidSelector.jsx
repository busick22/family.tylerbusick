// "Who are you?" — kid picker plus a Parent tab with a 4-tile admin
// dashboard (Members, Screen Time, Points, Pending requests).

import { useState } from 'react'
import { Users, Clock, Star, Inbox } from 'lucide-react'
import Notice, { useNotice } from '../../components/Notice.jsx'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useMembers } from '../../state/MembersContext.jsx'
import { useKidPoints } from '../../state/KidPointsContext.jsx'
import { useScreenTime } from '../../state/ScreenTimeContext.jsx'
import { DAYS, KIDS, formatMs } from '../../lib/family.js'
import { kidTheme } from '../../lib/kidThemes.js'
import { assignedOpenTasksFor, isOverdueChore, kidBalance, pendingItems } from './kidsUtils.js'
import MembersModal from './admin/MembersModal.jsx'
import ScreenTimeAdminModal from './admin/ScreenTimeAdminModal.jsx'
import PointsAdminModal from './admin/PointsAdminModal.jsx'
import PendingModal from './admin/PendingModal.jsx'

export default function KidSelector({ onSelectKid }) {
  const [section, setSection] = useState('kids')
  const [notice, showNotice] = useNotice()
  const [openTile, setOpenTile] = useState(null)

  const { chores } = useChores()
  const { todos } = useTodos()
  const { members } = useMembers()
  const { kidPoints } = useKidPoints()
  const { requests, viewFor } = useScreenTime()

  const dayName = DAYS[new Date().getDay()]
  const todayIndex = new Date().getDay()

  function badgeFor(name) {
    const myChores = chores.filter((c) => c.assignee === name && (c.day === dayName || isOverdueChore(c, todayIndex)))
    const myTasks = assignedOpenTasksFor(todos, name)
    const openChores = myChores.filter((c) => !c.done)
    const total = openChores.length + myTasks.length
    const allDone = (myChores.length > 0 || myTasks.length > 0) && total === 0
    if (allDone) return { text: 'All done ✓', cls: 'all-done' }
    if (total > 0) return { text: `${total} today`, cls: 'has-items' }
    return null
  }

  const pendingCount = pendingItems(kidPoints, requests).length
  const screenTimeSummary = (() => {
    const running = KIDS.map((n) => ({ name: n, view: viewFor(n) })).find((s) => s.view.running)
    if (running) return `${running.name}: ${formatMs(Math.max(0, running.view.remaining))} left`
    const expired = KIDS.map((n) => ({ name: n, view: viewFor(n) })).find((s) => s.view.remaining <= 0)
    if (expired) return `${expired.name}: time's up`
    const totalMin = KIDS.reduce((s, n) => s + Math.round(Math.max(0, viewFor(n).remaining) / 60000), 0)
    return `${totalMin} min left across kids`
  })()

  return (
    <div className="page page-enter" data-page="kids">
      <Notice notice={notice} />
      <header className="page-head">
        <h1 className="page-title">Kids</h1>
      </header>

      <nav className="seg-tabs" aria-label="Kids sections">
        <button type="button" className="seg-tab" data-active={section === 'kids'} onClick={() => setSection('kids')}>
          👦 Kids
        </button>
        <button type="button" className="seg-tab" data-active={section === 'parent'} onClick={() => setSection('parent')}>
          ⚙️ Parent
        </button>
      </nav>

      {section === 'kids' && (
        <div className="kid-select-shell">
          <p className="kid-select-sub">Tap your name to get started</p>
          <div className="kid-btns">
            {KIDS.map((name) => {
              const theme = kidTheme(name)
              const badge = badgeFor(name)
              return (
                <button
                  key={name}
                  type="button"
                  className="kid-btn"
                  style={{ '--kid-accent': theme.color }}
                  onClick={() => onSelectKid(name)}
                  aria-label={`Open ${name}'s dashboard`}
                >
                  <span className="kid-btn-emoji">{theme.emoji}</span>
                  <span className="kid-btn-info">
                    <span className="kid-btn-name">{name}</span>
                    <span className="kid-btn-age">{theme.age} · {theme.vibe}</span>
                  </span>
                  {badge && <span className={`kid-btn-badge ${badge.cls}`}>{badge.text}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {section === 'parent' && (
        <div className="parent-tile-grid">
          <button type="button" className="parent-tile" onClick={() => setOpenTile('members')}>
            <Users aria-hidden="true" className="parent-tile-icon" />
            <span className="parent-tile-name">Members</span>
            <span className="parent-tile-stat">
              {members.length ? `${members.length} ${members.length === 1 ? 'member' : 'members'}` : 'Add first member'}
            </span>
          </button>
          <button type="button" className="parent-tile" onClick={() => setOpenTile('screen-time')}>
            <Clock aria-hidden="true" className="parent-tile-icon" />
            <span className="parent-tile-name">Screen Time</span>
            <span className="parent-tile-stat">{screenTimeSummary}</span>
          </button>
          <button type="button" className="parent-tile" onClick={() => setOpenTile('points')}>
            <Star aria-hidden="true" className="parent-tile-icon" />
            <span className="parent-tile-name">Points</span>
            <span className="parent-tile-stat">
              {KIDS.map((n) => `${n[0]}:${kidBalance(kidPoints, n)}`).join(' · ')}
            </span>
          </button>
          <button
            type="button"
            className="parent-tile"
            data-urgent={pendingCount > 0}
            onClick={() => setOpenTile('pending')}
          >
            <Inbox aria-hidden="true" className="parent-tile-icon" />
            <span className="parent-tile-name">Pending</span>
            <span className="parent-tile-stat">
              {pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'request' : 'requests'} waiting` : 'No requests'}
            </span>
          </button>
        </div>
      )}

      {openTile === 'members' && <MembersModal onClose={() => setOpenTile(null)} />}
      {openTile === 'screen-time' && (
        <ScreenTimeAdminModal onClose={() => setOpenTile(null)} showNotice={showNotice} />
      )}
      {openTile === 'points' && <PointsAdminModal onClose={() => setOpenTile(null)} showNotice={showNotice} />}
      {openTile === 'pending' && <PendingModal onClose={() => setOpenTile(null)} showNotice={showNotice} />}
    </div>
  )
}
