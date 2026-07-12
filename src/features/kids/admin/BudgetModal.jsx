// Parent admin — set a kid's daily screen-time budget, in minutes.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../../components/Modal.jsx'
import { useScreenTime } from '../../../state/ScreenTimeContext.jsx'
import { DEFAULT_BUDGETS_MS, FALLBACK_DAILY_BUDGET_MS } from '../../../lib/screenTime.js'

export default function BudgetModal({ kidName, onClose, showNotice }) {
  const { getFor, setBudget } = useScreenTime()
  const data = getFor(kidName)
  const [mins, setMins] = useState(
    Math.round((data.dailyBudgetMs || DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS) / 60000),
  )
  const [busy, setBusy] = useState(false)

  async function save() {
    const value = Math.max(0, parseInt(mins, 10) || 0)
    setBusy(true)
    try {
      await setBudget(kidName, value)
      showNotice?.(`${kidName}'s budget set to ${value} min/day.`, 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice?.("Couldn't save the budget.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(360px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>Set Daily Budget</h3>

      <label className="field-label" htmlFor="budget-kid">Kid</label>
      <input id="budget-kid" className="field" value={kidName} disabled />

      <label className="field-label" htmlFor="budget-mins">Daily budget (minutes)</label>
      <input
        id="budget-mins"
        type="number"
        min="0"
        max="600"
        step="5"
        className="field"
        value={mins}
        onChange={(e) => setMins(e.target.value)}
        autoFocus
      />

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          Save Budget
        </button>
      </div>
    </Modal>
  )
}
