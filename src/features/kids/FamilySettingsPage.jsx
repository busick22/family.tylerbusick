// Family settings — the grown-ups' screen at /parent: four tiles that open
// Members, Screen Time, Points and Requests, plus the whose-turn rotation.
//
// Split out of KidSelector.jsx, which was serving both this page and the kid
// picker behind a `parentOnly` flag.

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Clock, Star, Inbox } from 'lucide-react'
import { useMembers } from '../../state/MembersContext.jsx'
import { useKidPoints } from '../../state/KidPointsContext.jsx'
import { useScreenTime } from '../../state/ScreenTimeContext.jsx'
import { KIDS, formatMs } from '../../lib/family.js'
import { kidBalance, pendingItems } from './kidsUtils.js'
import MembersModal from './admin/MembersModal.jsx'
import ScreenTimeAdminModal from './admin/ScreenTimeAdminModal.jsx'
import PointsAdminModal from './admin/PointsAdminModal.jsx'
import PendingModal from './admin/PendingModal.jsx'
import TurnControls from '../planning/TurnControls.jsx'
import './kids.css'

function screenTimeSummary(viewFor) {
  const views = KIDS.map((name) => ({ name, view: viewFor(name) }))
  const running = views.find((s) => s.view.running)
  if (running) return `${running.name}: ${formatMs(Math.max(0, running.view.remaining))} left`
  const expired = views.find((s) => s.view.remaining <= 0)
  if (expired) return `${expired.name}: time's up`
  const totalMin = views.reduce((sum, s) => sum + Math.round(Math.max(0, s.view.remaining) / 60000), 0)
  return `${totalMin} min left across kids`
}

export default function FamilySettingsPage() {
  const [params] = useSearchParams()
  const [openTile, setOpenTile] = useState(params.get('open') === 'pending' ? 'pending' : null)

  const { members } = useMembers()
  const { kidPoints } = useKidPoints()
  const { requests, viewFor } = useScreenTime()

  const pendingCount = pendingItems(kidPoints, requests).length
  const close = () => setOpenTile(null)

  return (
    <div className="page page-enter">
      <header className="page-head">
        <h1 className="page-title">Family settings</h1>
      </header>

      <div className="parent-tile-grid">
        <button type="button" className="parent-tile" onClick={() => setOpenTile('members')}>
          <Users aria-hidden="true" className="parent-tile-icon" />
          <span className="parent-tile-name">Members</span>
          <span className="parent-tile-stat">
            {members.length
              ? `${members.length} ${members.length === 1 ? 'member' : 'members'}`
              : 'Add first member'}
          </span>
        </button>
        <button type="button" className="parent-tile" onClick={() => setOpenTile('screen-time')}>
          <Clock aria-hidden="true" className="parent-tile-icon" />
          <span className="parent-tile-name">Screen Time</span>
          <span className="parent-tile-stat">{screenTimeSummary(viewFor)}</span>
        </button>
        <button type="button" className="parent-tile" onClick={() => setOpenTile('points')}>
          <Star aria-hidden="true" className="parent-tile-icon" />
          <span className="parent-tile-name">Points</span>
          <span className="parent-tile-stat">
            {KIDS.map((n) => `${n}: ${kidBalance(kidPoints, n)}`).join(' · ')}
          </span>
        </button>
        <button
          type="button"
          className="parent-tile"
          data-urgent={pendingCount > 0}
          onClick={() => setOpenTile('pending')}
        >
          <Inbox aria-hidden="true" className="parent-tile-icon" />
          <span className="parent-tile-name">Requests</span>
          <span className="parent-tile-stat">
            {pendingCount
              ? `${pendingCount} ${pendingCount === 1 ? 'request' : 'requests'} waiting`
              : 'No requests'}
          </span>
        </button>
      </div>

      <TurnControls />

      {openTile === 'members' && <MembersModal onClose={close} />}
      {openTile === 'screen-time' && <ScreenTimeAdminModal onClose={close} />}
      {openTile === 'points' && <PointsAdminModal onClose={close} />}
      {openTile === 'pending' && <PendingModal onClose={close} />}
    </div>
  )
}
