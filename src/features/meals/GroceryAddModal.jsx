// Quick "add a grocery item" modal, reachable from the page's + button so
// you can jot something down without visiting the Grocery tab.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useGrocery } from '../../state/GroceryContext.jsx'
import { useAisles } from '../../state/AislesContext.jsx'

export default function GroceryAddModal({ onClose, showNotice }) {
  const grocery = useGrocery()
  const { getAisle } = useAisles()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      showNotice('Please add an item name.', 'error')
      return
    }
    setBusy(true)
    try {
      await grocery.save(
        [
          ...grocery.items,
          {
            id: `manual-${Date.now()}`,
            name: trimmed,
            amount: amount.trim(),
            aisle: getAisle(trimmed),
            checked: false,
            manual: true,
            sources: [],
          },
        ],
        grocery.selectedDays,
      )
      showNotice('Grocery item added.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save that grocery item.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(430px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>Add Grocery Item</h3>
      <div className="form-2col">
        <div>
          <label className="field-label" htmlFor="grocery-add-name">Item *</label>
          <input
            id="grocery-add-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
            }}
            placeholder="e.g. Milk"
            autoFocus
          />
        </div>
        <div>
          <label className="field-label" htmlFor="grocery-add-amount">Amount</label>
          <input
            id="grocery-add-amount"
            className="field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
            }}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="modal-actions">
        <span className="modal-actions-gap" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          Add item
        </button>
      </div>
    </Modal>
  )
}
