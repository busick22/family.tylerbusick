import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { WISH_LIMITS } from '../../lib/wishLists.js'

export default function WishEditModal({ kind, value, onSave, onDelete, onClose }) {
  const isItem = kind === 'item'
  const [name, setName] = useState(value?.name || '')
  const [link, setLink] = useState(value?.link || '')
  const [notes, setNotes] = useState(value?.notes || '')
  const [price, setPrice] = useState(value?.price ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const close = () => {
    if (!busy) onClose()
  }

  async function perform(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      onClose()
    } catch (err) {
      setError(err?.code ? 'Could not save this change. Check your connection and try again.' : err.message)
      setBusy(false)
    }
  }

  return (
    <Modal onClose={close}>
      <button className="icon-btn modal-close" onClick={close} aria-label="Close" disabled={busy}>
        <X aria-hidden="true" />
      </button>
      <h3>
        {value ? 'Edit' : 'New'} {isItem ? 'wish' : 'wish list'}
      </h3>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          perform(() => onSave(isItem ? { name, link, notes, price } : name))
        }}
      >
        <fieldset className="wish-fields" disabled={busy}>
          <label className="field-label" htmlFor="wish-name">
            {isItem ? 'Wish name' : 'List name'}
          </label>
          <input
            className="field"
            id="wish-name"
            autoFocus
            required
            maxLength={isItem ? WISH_LIMITS.name : WISH_LIMITS.listName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isItem ? 'What would you love?' : 'Birthday, Christmas, Just because…'}
          />
          {isItem && (
            <>
              <label className="field-label" htmlFor="wish-link">
                Store link <span>(optional)</span>
              </label>
              <input
                className="field"
                id="wish-link"
                inputMode="url"
                maxLength={WISH_LIMITS.link}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
              />
              <label className="field-label" htmlFor="wish-price">
                Price in dollars <span>(optional)</span>
              </label>
              <input
                className="field"
                id="wish-price"
                type="number"
                inputMode="decimal"
                min="0"
                max="999999.99"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
              <label className="field-label" htmlFor="wish-notes">
                Notes <span>(optional)</span>
              </label>
              <textarea
                className="field"
                id="wish-notes"
                rows={3}
                maxLength={WISH_LIMITS.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Favorite color, size, or anything else…"
              />
            </>
          )}
          {error && (
            <p className="wish-error" role="alert">
              {error}
            </p>
          )}
          {confirming && (
            <p className="wish-hint" role="status">
              {isItem
                ? 'Remove this wish and its purchase note?'
                : 'Remove this list and all its wishes? Its shared link will stop working.'}
            </p>
          )}
          <div className="modal-actions">
            {onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => (confirming ? perform(onDelete) : setConfirming(true))}
              >
                {confirming ? 'Yes, remove' : 'Remove'}
              </button>
            )}
            <span className="modal-actions-gap" />
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
