// A kid asking a parent for extra screen time — picks a duration, sends a
// screenTimeRequests doc a parent can grant/deny from the Pending tile.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useScreenTime } from '../../state/ScreenTimeContext.jsx'
import { useNotice } from '../../state/NoticeContext.jsx'

const OPTIONS_MIN = [5, 10, 15, 30]

export default function TimeRequestModal({ kid, onClose }) {
  const showNotice = useNotice()
  const { addRequest } = useScreenTime()
  const [mins, setMins] = useState(10)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await addRequest(kid, mins * 60000)
      showNotice(`Sent a request for ${mins} more minutes.`, 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't send that request.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(360px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>Ask for more time</h3>

      <label className="field-label">How much extra time?</label>
      <div className="time-pick-row">
        {OPTIONS_MIN.map((m) => (
          <button key={m} type="button" className="chip" data-active={mins === m} onClick={() => setMins(m)}>
            +{m} min
          </button>
        ))}
      </div>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          Send Request
        </button>
      </div>
    </Modal>
  )
}
