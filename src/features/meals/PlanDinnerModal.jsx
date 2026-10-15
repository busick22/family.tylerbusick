import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import RecipeViewBody from './RecipeViewBody.jsx'
import { useMeals } from '../../state/MealsContext.jsx'
import { useRecipes } from '../../state/RecipesContext.jsx'
import { dayLabel } from '../../lib/planning.js'
import { useNotice } from '../../state/NoticeContext.jsx'

export default function PlanDinnerModal({ dateKey, onClose, inline = false, onCook }) {
  const showNotice = useNotice()
  const { meals, assignMeal, saveSimpleMeal, clearMeal, loading, error: loadError } = useMeals()
  const { recipes, getRecipe } = useRecipes()
  const meal = meals[dateKey]
  const [searching, setSearching] = useState(!meal)
  const [query, setQuery] = useState('')
  const [simple, setSimple] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const matches = recipes
    .filter((r) => (r.name || '').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .slice(0, query ? 30 : 6)
  const assignedRecipe = meal?.recipeId ? getRecipe(meal.recipeId) : null

  async function save(action) {
    if (loading || loadError) {
      setError('Wait until your meal plan has loaded before making changes.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await action()
      showNotice('Dinner plan updated.', 'success')
      setSearching(false)
      onClose?.()
    } catch {
      setError('Could not save dinner. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const body = (
    <>
      {!inline && (
        <button className="icon-btn modal-close" onClick={onClose} disabled={busy} aria-label="Close">
          <X aria-hidden="true" />
        </button>
      )}
      <p className="workspace-eyebrow">{dayLabel(dateKey)}</p>
      <h3>{meal && !searching ? meal.recipeName : 'What’s for dinner?'}</h3>
      {(error || loadError) && (
        <p className="workspace-status" role="alert">
          {error || loadError}
        </p>
      )}
      {meal && !searching ? (
        <>
          {assignedRecipe && <RecipeViewBody recipe={assignedRecipe} />}
          <div className="workspace-actions meal-detail-actions">
            {assignedRecipe && onCook && (
              <button className="btn btn-primary" onClick={() => onCook(assignedRecipe.id)}>
                Start cooking
              </button>
            )}
            <button className="btn" onClick={() => setSearching(true)} disabled={busy}>
              Change dinner
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => (confirmRemove ? save(() => clearMeal(dateKey)) : setConfirmRemove(true))}
            >
              {confirmRemove ? 'Confirm remove' : 'Remove'}
            </button>
          </div>
        </>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (simple.trim()) save(() => saveSimpleMeal(dateKey, simple.trim()))
            }}
          >
            <label className="field-label" htmlFor="simple-dinner">
              Write in a plan
            </label>
            <div className="meal-write-in">
              <input
                id="simple-dinner"
                className="field"
                placeholder="Leftovers, tacos, eating out…"
                value={simple}
                onChange={(e) => setSimple(e.target.value)}
                required
              />
              <button className="btn btn-primary" disabled={busy}>
                Save
              </button>
            </div>
          </form>
          <label className="field-label" htmlFor="plan-search">
            Or choose a saved recipe
          </label>
          <input
            id="plan-search"
            type="search"
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a recipe…"
            autoComplete="off"
          />
          <div className="meal-recipe-options">
            {matches.map((recipe) => (
              <button
                className="agenda-row"
                key={recipe.id}
                onClick={() => save(() => assignMeal(dateKey, recipe))}
                disabled={busy}
              >
                <span>
                  <strong>{recipe.name}</strong>
                </span>
                <span className="meal-pick-label">Choose</span>
              </button>
            ))}
            {!matches.length && (
              <p className="empty-inline">
                {recipes.length ? 'No matching recipes.' : 'Your saved recipes will appear here.'}
              </p>
            )}
          </div>
          <Link className="btn btn-ghost" to="/meals?tab=recipes" onClick={onClose}>
            Open recipe collection
          </Link>
          {meal && (
            <button className="btn btn-ghost" onClick={() => setSearching(false)}>
              Keep current dinner
            </button>
          )}
        </>
      )}
    </>
  )
  return inline ? (
    <section className="workspace-surface day-detail meal-editor" aria-label="Plan dinner">
      {body}
    </section>
  ) : (
    <Modal onClose={busy ? () => {} : onClose} width="min(520px, 100%)">
      {body}
    </Modal>
  )
}
