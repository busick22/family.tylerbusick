// Parent admin — points at a glance (with reset), plus quick point-value
// editing for kid tasks/chores and the rewards catalog. Internal tab bar
// mirrors the old app's Overview/Tasks/Chores/Rewards panes.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../../components/Modal.jsx'
import { useTodos } from '../../../state/TodosContext.jsx'
import { useChores } from '../../../state/ChoresContext.jsx'
import { useRewards } from '../../../state/RewardsContext.jsx'
import { useKidPoints } from '../../../state/KidPointsContext.jsx'
import { KIDS, isKidStackAssignee } from '../../../lib/family.js'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'chores', label: 'Chores' },
  { id: 'rewards', label: 'Rewards' },
]

export default function PointsAdminModal({ onClose, showNotice }) {
  const { todos, updateTodo } = useTodos()
  const { chores, updateChore } = useChores()
  const { activeRewards, addReward, archiveReward } = useRewards()
  const { getBalance, resetKids } = useKidPoints()

  const [tab, setTab] = useState('overview')
  const [resetTarget, setResetTarget] = useState(null) // kid name | 'all' | null
  const [rewardName, setRewardName] = useState('')
  const [rewardCost, setRewardCost] = useState('')

  const kidTodos = todos.filter((t) => !t.done && isKidStackAssignee(t.assignee))
  const kidChores = chores.filter((c) => KIDS.includes(c.assignee))

  async function setTodoPoints(id, value) {
    await updateTodo(id, { points: Math.max(0, parseInt(value, 10) || 0) })
  }
  async function setChorePoints(id, value) {
    await updateChore(id, { points: Math.max(0, parseInt(value, 10) || 0) })
  }
  async function confirmReset() {
    const targets = resetTarget === 'all' ? [...KIDS] : [resetTarget]
    setResetTarget(null)
    try {
      await resetKids(targets)
      showNotice?.('Points reset.', 'success')
    } catch (e) {
      console.error(e)
      showNotice?.("Couldn't reset points.", 'error')
    }
  }
  async function addRewardEntry() {
    const name = rewardName.trim()
    const cost = Math.max(1, parseInt(rewardCost, 10) || 1)
    if (!name) return
    await addReward(name, cost)
    setRewardName('')
    setRewardCost('')
  }

  return (
    <Modal onClose={onClose} width="min(560px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>⭐ Points</h3>

      <div className="seg-tabs admin-modal-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="seg-tab"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="admin-points-tiles">
            {KIDS.map((name) => (
              <div className="admin-points-tile" key={name}>
                <div className="ppt-name">{name}</div>
                <div className="ppt-val">{getBalance(name)}</div>
              </div>
            ))}
          </div>
          <p className="admin-hint">Resetting clears that kid&rsquo;s earned and redeemed history.</p>
          <div className="admin-add-row">
            {KIDS.map((name) => (
              <button key={name} className="chip" onClick={() => setResetTarget(name)}>
                Reset {name}
              </button>
            ))}
            <button className="chip" data-danger="true" onClick={() => setResetTarget('all')}>
              Reset All
            </button>
          </div>
          {resetTarget && (
            <div className="admin-inline-confirm">
              <span>Reset {resetTarget === 'all' ? "ALL kids'" : `${resetTarget}'s`} points?</span>
              <button className="btn btn-danger btn-sm" onClick={confirmReset}>
                Yes, reset
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setResetTarget(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          <p className="admin-hint">Set how many points each task is worth.</p>
          {kidTodos.length === 0 && <p className="admin-empty">No tasks yet.</p>}
          {kidTodos.map((t) => (
            <div className="admin-pts-row" key={t.id}>
              <span className="admin-pts-label">{t.text}</span>
              <span className="admin-pts-meta">{t.assignee}</span>
              <input
                type="number"
                min="0"
                max="999"
                className="field admin-pts-input"
                defaultValue={t.points || 0}
                onBlur={(e) => setTodoPoints(t.id, e.target.value)}
                aria-label={`Points for task ${t.text}`}
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'chores' && (
        <div>
          <p className="admin-hint">Set how many points each chore is worth.</p>
          {kidChores.length === 0 && <p className="admin-empty">No chores yet.</p>}
          {kidChores.map((c) => (
            <div className="admin-pts-row" key={c.id}>
              <span className="admin-pts-label">{c.name}</span>
              <span className="admin-pts-meta">{c.assignee} · {c.day || ''}</span>
              <input
                type="number"
                min="0"
                max="999"
                className="field admin-pts-input"
                defaultValue={c.points || 0}
                onBlur={(e) => setChorePoints(c.id, e.target.value)}
                aria-label={`Points for chore ${c.name}`}
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'rewards' && (
        <div>
          <p className="admin-hint">Rewards kids can redeem with their points.</p>
          {activeRewards.length === 0 && <p className="admin-empty">No rewards yet.</p>}
          {activeRewards.map((r) => (
            <div className="admin-pts-row" key={r.id}>
              <span className="admin-pts-label">{r.name}</span>
              <span className="admin-pts-cost">{r.cost}pts</span>
              <button
                className="icon-btn"
                onClick={() => archiveReward(r.id)}
                aria-label={`Remove reward ${r.name}`}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="admin-add-row">
            <input
              className="field"
              placeholder="Reward name…"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRewardEntry()}
            />
            <input
              type="number"
              min="1"
              className="field admin-pts-input"
              placeholder="pts"
              value={rewardCost}
              onChange={(e) => setRewardCost(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRewardEntry()}
            />
            <button className="btn btn-primary" onClick={addRewardEntry}>
              ＋ Add
            </button>
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}
