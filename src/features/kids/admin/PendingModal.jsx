// Parent admin — one inbox for everything waiting on a parent: reward
// redemption requests and screen-time "more please" requests.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../../components/Modal.jsx'
import { useKidPoints } from '../../../state/KidPointsContext.jsx'
import { useScreenTime } from '../../../state/ScreenTimeContext.jsx'
import { pendingItems } from '../kidsUtils.js'

export default function PendingModal({ onClose, showNotice }) {
  const { kidPoints, approveRedemption, denyRedemption } = useKidPoints()
  const { requests, grantRequest, deleteRequest } = useScreenTime()
  const [busy, setBusy] = useState(null)

  const items = pendingItems(kidPoints, requests)

  async function grant(item) {
    setBusy(item.id)
    try {
      const granted = await grantRequest(item.id)
      showNotice?.(granted ? `Added ${Math.round(granted.requestedMs / 60000)} minutes for ${granted.kidName}.` : 'That request was already handled.', 'success')
    } catch (e) {
      console.error(e)
      showNotice?.("Couldn't grant that request.", 'error')
    } finally { setBusy(null) }
  }
  async function deny(item) {
    setBusy(item.id)
    try {
      await deleteRequest(item.id)
      showNotice?.('Request denied.', 'success')
    } catch (e) {
      console.error(e)
      showNotice?.("Couldn't deny that request.", 'error')
    } finally { setBusy(null) }
  }
  async function handleRedemption(item, approve) {
    const key = `redeem-${item.kidName}-${item.idx}`
    setBusy(key)
    try {
      const handled = await (approve ? approveRedemption(item.kidName, item.idx, item) : denyRedemption(item.kidName, item.idx, item))
      showNotice?.(handled ? `Request ${approve ? 'approved' : 'denied'}.` : 'That request was already handled.', 'success')
    } catch (e) {
      console.error(e)
      showNotice?.(`Couldn't ${approve ? 'approve' : 'deny'} that request.`, 'error')
    } finally { setBusy(null) }
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
            <button className="chip" disabled={busy !== null} onClick={() => handleRedemption(item, true)}>
              Approve
            </button>
            <button className="chip" data-danger="true" disabled={busy !== null} onClick={() => handleRedemption(item, false)}>
              Deny
            </button>
          </div>
        ) : (
          <div className="admin-req-row" key={`time-${item.id}`}>
            <div className="admin-req-text">
              ⏰ <strong>{item.kidName}</strong> asked for <strong>+{Math.round((item.requestedMs || 0) / 60000)} min</strong> of screen time
            </div>
            <button className="chip" disabled={busy !== null} onClick={() => grant(item)}>
              Grant
            </button>
            <button className="chip" data-danger="true" disabled={busy !== null} onClick={() => deny(item)}>
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
