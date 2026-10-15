import { useState } from 'react'
import { Copy, Share2, X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { sharedWishUrl } from '../../lib/wishLists.js'
import { useWishLists } from '../../state/WishListsContext.jsx'

export default function WishShareModal({ list, onClose }) {
  const { setSharing } = useWishLists()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const url = sharedWishUrl(list.id)

  async function toggleSharing() {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await setSharing(list.id, !list.shared)
    } catch {
      setError('Could not change sharing. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    setError('')
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copied!')
    } catch {
      setError('Select and copy the link below.')
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `${list.kid}’s ${list.name}`, url })
    } catch (err) {
      if (err.name !== 'AbortError') setError('Sharing could not open. You can copy the link instead.')
    }
  }

  return (
    <Modal
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close" disabled={busy}>
        <X aria-hidden="true" />
      </button>
      <h3>Share {list.name}</h3>
      <p className="wish-hint">
        Anyone with the link can see {list.kid}’s name and the wishes on this list, without signing in. They
        can’t edit it or see purchase details.
      </p>
      {!list.shared ? (
        <button className="btn btn-primary" disabled={busy} onClick={toggleSharing}>
          {busy ? 'Turning on…' : 'Turn on link sharing'}
        </button>
      ) : (
        <>
          <label className="field-label" htmlFor="wish-share-link">
            Shareable link
          </label>
          <input
            className="field"
            id="wish-share-link"
            value={url}
            readOnly
            onFocus={(event) => event.target.select()}
          />
          <div className="wish-actions">
            <button className="btn btn-primary" onClick={copy} disabled={busy}>
              <Copy size={16} aria-hidden="true" /> Copy link
            </button>
            {typeof navigator.share === 'function' && (
              <button className="btn" onClick={share} disabled={busy}>
                <Share2 size={16} aria-hidden="true" /> Share
              </button>
            )}
          </div>
          <button className="btn btn-ghost" onClick={toggleSharing} disabled={busy}>
            {busy ? 'Turning off…' : 'Turn off link sharing'}
          </button>
          <p className="wish-hint">
            Turning sharing off disables this link. Turning it on again reuses the same link.
          </p>
        </>
      )}
      {message && (
        <p className="wish-hint" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="wish-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
