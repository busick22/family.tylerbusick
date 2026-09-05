// Parent admin — one inbox for everything waiting on a parent: reward
// redemption requests and screen-time "more please" requests.

import { X } from 'lucide-react'
import Modal from '../../../components/Modal.jsx'
import { useKidPoints } from '../../../state/KidPointsContext.jsx'
import { useScreenTime } from '../../../state/ScreenTimeContext.jsx'
import { pendingItems } from '../kidsUtils.js'

export default function PendingModal({ onClose, showNotice }) {
  const { kidPoints, approveRedemption, denyRedemption } = useKidPoints()
  const { requests, adjustTime, deleteRequest } = useScreenTime()

  const items = pendingItems(kidPoints, requests)

  async function grant(item) {
    try {
      await adjustTime(item.kidName, item.requestedMs)
      await deleteRequest(item.id)
    } catch (e) {
      console.error(e)
      showNotice?.("Couldn't grant that request.", 'error')
    }
  }
  async function deny(item) {
    try {
      await deleteRequest(item.id)
      showNotice?.('Request denied.', 'success')
    } catch (e) {
      console.error(e)
      showNotice?.("Couldn't deny that request.", 'error')
    }
  }

  return (
    <Modal onClose={onClose} width="min(500px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>📬 Pending Requests</h3>

      {items.length === 0 && <p className="admin-empty">No pending requests.</p>}

      {items.map((item) =>
        item.kind === 'redeem' ? (
          <div className="admin-req-row" key={`redeem-${item.kidName}-${item.idx}`}>
            <div className="admin-req-text">
              🎁 <strong>{item.kidName}</strong> wants <strong>{item.name}</strong> · {item.cost} pts
            </div>
            <button className="chip" onClick={() => approveRedemption(item.kidName, item.idx, item)}>
              Approve
            </button>
            <button className="chip" data-danger="true" onClick={() => denyRedemption(item.kidName, item.idx, item)}>
              Deny
            </button>
          </div>
        ) : (
          <div className="admin-req-row" key={`time-${item.id}`}>
            <div className="admin-req-text">
              ⏰ <strong>{item.kidName}</strong> asked for <strong>+{Math.round((item.requestedMs || 0) / 60000)} min</strong> of screen time
            </div>
            <button className="chip" onClick={() => grant(item)}>
              Grant
            </button>
            <button className="chip" data-danger="true" onClick={() => deny(item)}>
              Deny
            </button>
          </div>
        ),
      )}

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}
