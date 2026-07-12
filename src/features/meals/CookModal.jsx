// Cook mode: big checkable ingredient list + instructions, for propping the
// tablet on the counter while cooking.

import { useState } from 'react'
import { Clock, Flame } from 'lucide-react'
import Modal from '../../components/Modal.jsx'

export default function CookModal({ recipe, onClose }) {
  const [checked, setChecked] = useState(() => new Set())

  function toggle(index) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const metas = []
  if (recipe.prep) metas.push(`Prep: ${recipe.prep}`)
  if (recipe.cook) metas.push(`Cook: ${recipe.cook}`)

  return (
    <Modal onClose={onClose} width="min(560px, 100%)">
      <div className="cook-head">
        <h3>{recipe.name || ''}</h3>
        {metas.length > 0 && (
          <p className="cook-meta">
            {recipe.prep && (
              <span>
                <Clock aria-hidden="true" size={13} /> Prep: {recipe.prep}
              </span>
            )}
            {recipe.cook && (
              <span>
                <Flame aria-hidden="true" size={13} /> Cook: {recipe.cook}
              </span>
            )}
          </p>
        )}
      </div>

      {(recipe.ingredients || []).length > 0 && (
        <>
          <p className="recipe-view-section">Ingredients</p>
          <div className="cook-ings">
            {recipe.ingredients.map((ing, i) => (
              <label className="cook-ing" data-checked={checked.has(i)} key={i}>
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={() => toggle(i)}
                  aria-label={`Mark ${ing.name} prepared`}
                />
                <span className="recipe-view-ing-amount">{ing.amount}</span>
                <span>{ing.name}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {recipe.notes && (
        <>
          <p className="recipe-view-section">Instructions</p>
          <div className="recipe-view-notes">{recipe.notes}</div>
        </>
      )}

      <div className="modal-actions">
        <span className="modal-actions-gap" />
        <button className="btn btn-primary" onClick={onClose}>
          Done cooking
        </button>
      </div>
    </Modal>
  )
}
