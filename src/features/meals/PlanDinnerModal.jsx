// Assign a dinner to a day. If one is planned: show it with Remove/Change;
// otherwise a type-ahead search over the recipe box.

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import RecipeViewBody from './RecipeViewBody.jsx'
import { useMeals } from '../../state/MealsContext.jsx'
import { useRecipes } from '../../state/RecipesContext.jsx'

export default function PlanDinnerModal({ dateKey, onClose, showNotice }) {
  const { meals, assignMeal, clearMeal } = useMeals()
  const { recipes, getRecipe } = useRecipes()
  const meal = meals[dateKey]
  const [searching, setSearching] = useState(!meal)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const [y, m, d] = dateKey.split('-').map(Number)
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return recipes
      .filter((r) => (r.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [recipes, query])

  const assignedRecipe = meal ? getRecipe(meal.recipeId) : null

  async function pick(recipe) {
    setBusy(true)
    try {
      await assignMeal(dateKey, recipe)
      showNotice('Dinner plan updated.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't assign that recipe.", 'error')
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await clearMeal(dateKey)
      showNotice('Dinner removed.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't remove that meal.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(480px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>{meal && !searching ? 'Dinner Planned' : 'Plan Dinner'}</h3>
      <p className="plan-date">{dateLabel}</p>

      {meal && !searching ? (
        <>
          {assignedRecipe ? (
            <RecipeViewBody recipe={assignedRecipe} />
          ) : (
            <p>
              <strong>{meal.recipeName}</strong>
            </p>
          )}
          <div className="modal-actions">
            <button className="btn btn-danger" onClick={remove} disabled={busy}>
              Remove
            </button>
            <span className="modal-actions-gap" />
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Close
            </button>
            <button className="btn btn-primary" onClick={() => setSearching(true)} disabled={busy}>
              Change
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="field-label" htmlFor="plan-search">Search for a recipe</label>
          <input
            id="plan-search"
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing…"
            autoComplete="off"
            autoFocus
          />
          {query.trim() && (
            <div className="plan-results">
              {matches.length ? (
                matches.map((r) => (
                  <button
                    type="button"
                    className="plan-result"
                    key={r.id}
                    onClick={() => pick(r)}
                    disabled={busy}
                  >
                    {r.name || ''}
                  </button>
                ))
              ) : (
                <p className="plan-results-empty">No recipes found.</p>
              )}
            </div>
          )}
          <div className="modal-actions">
            <span className="modal-actions-gap" />
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
