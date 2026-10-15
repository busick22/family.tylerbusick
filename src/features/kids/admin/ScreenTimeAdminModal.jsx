// Parent admin — each kid's screen-time budget/usage, with quick +/- time
// adjustments, a full reset, and a link into BudgetModal for the daily cap.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../../components/Modal.jsx'
import { useScreenTime } from '../../../state/ScreenTimeContext.jsx'
import { KIDS, formatMs } from '../../../lib/family.js'
import { useTick } from '../useTick.js'
import BudgetModal from './BudgetModal.jsx'
import { useNotice } from '../../../state/NoticeContext.jsx'

export default function ScreenTimeAdminModal({ onClose }) {
  const showNotice = useNotice()
  const { viewFor, adjustTime, resetToday } = useScreenTime()
  const [budgetKid, setBudgetKid] = useState(null)
  useTick(1000)

  async function adjust(kidName, deltaMs) {
    try {
      await adjustTime(kidName, deltaMs)
      showNotice(`${deltaMs > 0 ? '+' : ''}${Math.round(deltaMs / 60000)} min for ${kidName}.`, 'success')
    } catch (e) {
      console.error(e)
      showNotice("Couldn't adjust time.", 'error')
    }
  }

  async function reset(kidName) {
    try {
      await resetToday(kidName)
    } catch (e) {
      console.error(e)
      showNotice("Couldn't reset.", 'error')
    }
  }

  return (
    <>
      <Modal onClose={onClose} width="min(560px, 100%)">
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" />
        </button>
        <h3>⏰ Screen Time</h3>
        <p className="admin-hint">
          Each kid has a daily budget. Add bonus time, take time away, or set a new daily limit.
        </p>

        <div className="admin-st-rows">
          {KIDS.map((name) => {
            const view = viewFor(name)
            const budgetMin = Math.round((view.budget || 0) / 60000)
            const usedMin = Math.round(Math.min(view.budget, view.budget - view.remaining) / 60000)
            const expired = view.remaining <= 0
            const status = expired ? 'Time’s up' : view.running ? 'Running' : 'Paused'
            const statusCls = expired ? 'expired' : view.running ? 'running' : ''
            return (
              <div className="admin-st-row" key={name}>
                <div className="admin-st-kid">{name}</div>
                <div className="admin-st-readout">
                  <span className={`admin-st-time ${statusCls}`}>
                    {formatMs(Math.max(0, view.remaining))} · {status}
                  </span>
                  <span>
                    {usedMin} of {budgetMin} min used today
                  </span>
                </div>
                <div className="admin-st-actions">
                  <button className="chip" onClick={() => adjust(name, 5 * 60000)}>
                    +5
                  </button>
                  <button className="chip" onClick={() => adjust(name, 10 * 60000)}>
                    +10
                  </button>
                  <button className="chip" onClick={() => adjust(name, -10 * 60000)}>
                    −10
                  </button>
                  <button className="chip" onClick={() => adjust(name, -15 * 60000)}>
                    −15
                  </button>
                  <button className="chip" onClick={() => reset(name)}>
                    Reset
                  </button>
                  <button className="chip" onClick={() => setBudgetKid(name)}>
                    Budget…
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>

      {budgetKid && <BudgetModal kidName={budgetKid} onClose={() => setBudgetKid(null)} />}
    </>
  )
}
