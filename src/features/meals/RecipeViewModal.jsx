// Read-only recipe modal with jump-offs to cook mode and editing.

import { X, CookingPot, Pencil } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import RecipeViewBody from './RecipeViewBody.jsx'

export default function RecipeViewModal({ recipe, onClose, onCook, onEdit }) {
  return (
    <Modal onClose={onClose} width="min(520px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <RecipeViewBody recipe={recipe} />
      <div className="modal-actions">
        <span className="modal-actions-gap" />
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
        <button className="btn" onClick={onCook}>
          <CookingPot aria-hidden="true" size={16} /> Cook now
        </button>
        <button className="btn btn-primary" onClick={onEdit}>
          <Pencil aria-hidden="true" size={15} /> Edit
        </button>
      </div>
    </Modal>
  )
}
