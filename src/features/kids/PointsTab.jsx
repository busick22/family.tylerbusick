// A kid's Points tab: running total, the rewards catalog (view-only —
// redemption is arranged with a parent in person), and redemption history.

import { useKidPoints } from '../../state/KidPointsContext.jsx'
import { useRewards } from '../../state/RewardsContext.jsx'

export default function PointsTab({ kid }) {
  const { kidPoints } = useKidPoints()
  const { activeRewards } = useRewards()

  const data = kidPoints[kid] || { history: [], redeemed: [] }
  const earned = (data.history || []).reduce((s, e) => s + (e.points || 0), 0)
  const redeemedTotal = (data.redeemed || []).reduce((s, e) => s + (e.cost || 0), 0)
  const net = Math.max(0, earned - redeemedTotal)
  const redeemedList = [...(data.redeemed || [])].reverse()

  return (
    <div>
      <div className="points-card">
        <div className="points-total">{net}</div>
        <div>
          <div className="points-label">Total Points</div>
          <div className="points-sub">
            {net === 0
              ? 'Complete tasks and chores to earn more!'
              : `${earned} earned · ${redeemedTotal} redeemed`}
          </div>
        </div>
      </div>

      <div className="section-lbl">🎁 Rewards</div>
      <div className="kid-panel">
        {activeRewards.length === 0 && <div className="k-empty">No rewards set up yet — ask a parent!</div>}
        {activeRewards.map((r) => (
          <div className="reward-row" key={r.id}>
            <span className="reward-icon">🎁</span>
            <div className="reward-name">{r.name}</div>
            <div className="reward-cost">{r.cost} pts</div>
          </div>
        ))}
      </div>

      <div className="section-lbl" style={{ marginTop: '1rem' }}>
        🏷️ Redeemed
      </div>
      <div className="kid-panel">
        {redeemedList.length === 0 && <div className="k-empty">Nothing redeemed yet.</div>}
        {redeemedList.map((r, i) => (
          <div className="reward-row" key={i}>
            <span className="reward-icon">✅</span>
            <div>
              <div className="reward-name">{r.name}</div>
              <span className="reward-redeemed">{r.date || ''}</span>
            </div>
            <div className="reward-cost reward-cost-spent">-{r.cost} pts</div>
          </div>
        ))}
      </div>
    </div>
  )
}
