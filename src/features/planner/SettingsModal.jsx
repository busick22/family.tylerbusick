// Family Settings: the member list, the rewards catalog, and pending
// reward-redemption requests from the kids.

import { useMemo, useState } from 'react'
import { X, Plus, Gift } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useMembers } from '../../state/MembersContext.jsx'
import { useRewards } from '../../state/RewardsContext.jsx'
import { useKidPoints } from '../../state/KidPointsContext.jsx'

export default function SettingsModal({ onClose, showNotice }) {
  const { members, memberColor, addMember, removeMember } = useMembers()
  const { activeRewards, addReward, archiveReward } = useRewards()
  const { kidPoints, approveRedemption, denyRedemption } = useKidPoints()

  const [memberName, setMemberName] = useState('')
  const [rewardName, setRewardName] = useState('')
  const [rewardCost, setRewardCost] = useState('')
  const [confirmingMemberIdx, setConfirmingMemberIdx] = useState(null)

  const pending = useMemo(() => {
    const out = []
    Object.entries(kidPoints).forEach(([kidName, data]) => {
      ;(data.pendingRedemptions || []).forEach((r, idx) => out.push({ kidName, idx, ...r }))
    })
    return out
  }, [kidPoints])

  async function handleAddMember() {
    const name = memberName.trim()
    if (!name) return
    try {
      const added = await addMember(name)
      if (!added) {
        showNotice('That name is already added.', 'error')
        return
      }
      setMemberName('')
      showNotice('Member added.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save that member.", 'error')
    }
  }

  async function handleRemoveMember(index) {
    setConfirmingMemberIdx(null)
    try {
      await removeMember(index)
      showNotice('Member removed.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't remove that member.", 'error')
    }
  }

  async function handleAddReward() {
    const name = rewardName.trim()
    if (!name) {
      showNotice('Enter a reward name.', 'error')
      return
    }
    const cost = Math.max(1, parseInt(rewardCost, 10) || 1)
    try {
      await addReward(name, cost)
      setRewardName('')
      setRewardCost('')
      showNotice('Reward added.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't add reward.", 'error')
    }
  }

  async function handleArchiveReward(id) {
    try {
      await archiveReward(id)
      showNotice('Reward removed.', 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't remove reward.", 'error')
    }
  }

  async function handleApprove(kidName, idx) {
    try {
      const item = await approveRedemption(kidName, idx)
      if (item) showNotice(`Approved: ${item.name} for ${kidName}.`, 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't approve.", 'error')
    }
  }

  async function handleDeny(kidName, idx) {
    try {
      const item = await denyRedemption(kidName, idx)
      if (item) showNotice(`Denied: ${item.name} for ${kidName}.`, 'info')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't deny.", 'error')
    }
  }

  return (
    <Modal onClose={onClose} width="min(600px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>Family Settings</h3>

      <div className="panel-title settings-section-title">Family Members</div>
      <div className="member-badges">
        {members.length ? (
          members.map((m, i) => (
            <span className="member-badge" style={{ background: memberColor(m) }} key={m}>
              {m}
              {confirmingMemberIdx === i ? (
                <button
                  type="button"
                  className="member-badge-confirm"
                  onClick={() => handleRemoveMember(i)}
                  onBlur={() => setConfirmingMemberIdx(null)}
                >
                  Remove?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingMemberIdx(i)}
                  title="Remove member"
                  aria-label={`Remove ${m}`}
                >
                  <X aria-hidden="true" size={12} />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="planner-empty">No members yet.</span>
        )}
      </div>
      <div className="settings-add-row">
        <input
          className="field"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddMember()
          }}
          placeholder="Add a family member…"
          aria-label="New member name"
        />
        <button className="btn btn-sm" onClick={handleAddMember}>
          <Plus aria-hidden="true" size={15} /> Add
        </button>
      </div>

      <div className="panel-title settings-section-title">Rewards Catalog</div>
      <div className="settings-list">
        {activeRewards.length ? (
          activeRewards.map((r) => (
            <div className="settings-list-row" key={r.id}>
              <span className="settings-list-name">{r.name}</span>
              <span className="settings-list-cost">{r.cost} pts</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => handleArchiveReward(r.id)}
                aria-label={`Remove reward ${r.name}`}
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="planner-empty">No rewards yet — add one below.</p>
        )}
      </div>
      <div className="settings-add-row">
        <input
          className="field"
          value={rewardName}
          onChange={(e) => setRewardName(e.target.value)}
          placeholder="Reward name…"
          aria-label="New reward name"
        />
        <input
          className="field settings-cost-field"
          type="number"
          min="1"
          value={rewardCost}
          onChange={(e) => setRewardCost(e.target.value)}
          placeholder="Cost"
          aria-label="Reward cost in points"
        />
        <button className="btn btn-sm" onClick={handleAddReward}>
          <Plus aria-hidden="true" size={15} /> Add
        </button>
      </div>

      <div className="panel-title settings-section-title">Pending Redemptions</div>
      <div className="settings-list">
        {pending.length ? (
          pending.map((r) => (
            <div className="settings-list-row" key={`${r.kidName}-${r.idx}`}>
              <Gift aria-hidden="true" size={16} className="settings-gift" />
              <div className="settings-list-info">
                <span className="settings-list-name">{r.name}</span>
                <span className="settings-list-sub">
                  {r.kidName} · {r.cost} pts
                </span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleApprove(r.kidName, r.idx)}>
                Approve
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDeny(r.kidName, r.idx)}>
                Deny
              </button>
            </div>
          ))
        ) : (
          <p className="planner-empty">No pending requests.</p>
        )}
      </div>
    </Modal>
  )
}
