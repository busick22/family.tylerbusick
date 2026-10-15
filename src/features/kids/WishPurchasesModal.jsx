import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { X } from 'lucide-react'
import { db } from '../../firebase.js'
import Modal from '../../components/Modal.jsx'
import { WISH_LIMITS } from '../../lib/wishLists.js'

function PurchaseRow({ listId, item, purchase }) {
  const [editing, setEditing] = useState(false)
  const [purchased, setPurchased] = useState(false)
  const [purchasedBy, setPurchasedBy] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function edit() {
    setPurchased(purchase?.purchased || false)
    setPurchasedBy(purchase?.purchasedBy || '')
    setEditing(true)
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await setDoc(doc(db, 'wishLists', listId, 'purchases', item.id), {
        purchased,
        purchasedBy: purchased ? purchasedBy.trim() : '',
        updatedAt: serverTimestamp(),
      })
      setEditing(false)
    } catch {
      setError('Could not save the purchase. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="wish-purchase-row">
      <h4>{item.name}</h4>
      {!editing ? (
        <>
          <p className="wish-hint">
            {purchase?.purchased
              ? `Purchased${purchase.purchasedBy ? ` by ${purchase.purchasedBy}` : ''}`
              : 'Not marked as purchased'}
          </p>
          <button className="btn" onClick={edit} aria-label={`Update purchase for ${item.name}`}>
            Update purchase
          </button>
        </>
      ) : (
        <form onSubmit={save}>
          <fieldset className="wish-fields" disabled={busy}>
            <label className="wish-checkbox">
              <input
                type="checkbox"
                checked={purchased}
                onChange={(event) => setPurchased(event.target.checked)}
              />{' '}
              Purchased
            </label>
            {purchased && (
              <>
                <label className="field-label" htmlFor={`buyer-${item.id}`}>
                  Who purchased it? <span>(optional)</span>
                </label>
                <input
                  className="field"
                  id={`buyer-${item.id}`}
                  value={purchasedBy}
                  onChange={(event) => setPurchasedBy(event.target.value)}
                  maxLength={WISH_LIMITS.purchaser}
                  placeholder="Grandma, Aunt Amy…"
                />
              </>
            )}
            {error && (
              <p className="wish-error" role="alert">
                {error}
              </p>
            )}
            <div className="wish-actions">
              <button className="btn btn-primary" type="submit">
                {busy ? 'Saving…' : 'Save purchase'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </li>
  )
}

export default function WishPurchasesModal({ list, items, onClose }) {
  const [state, setState] = useState({ purchases: {}, loading: true, error: null })
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'wishLists', list.id, 'purchases'),
        (snapshot) => {
          setState({
            purchases: Object.fromEntries(snapshot.docs.map((entry) => [entry.id, entry.data()])),
            loading: false,
            error: null,
          })
        },
        () =>
          setState({
            purchases: {},
            loading: false,
            error: 'Purchase details could not load. Only an authorized parent can open them.',
          }),
      ),
    [list.id],
  )

  return (
    <Modal onClose={onClose}>
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>Parent gift tracking</h3>
      <p className="wish-hint">
        {list.kid}’s {list.name}. Purchase details appear only here, never on the wish list or its shared
        link.
      </p>
      {state.loading && <p role="status">Loading purchase details…</p>}
      {state.error && (
        <p className="wish-error" role="alert">
          {state.error}
        </p>
      )}
      {!state.loading && !state.error && (
        <ul className="wish-items">
          {items.map((item) => (
            <PurchaseRow key={item.id} listId={list.id} item={item} purchase={state.purchases[item.id]} />
          ))}
        </ul>
      )}
      {!items.length && <p className="wish-hint">Add a wish before tracking a purchase.</p>}
    </Modal>
  )
}
