// Read-only recipe details — shared by the view modal and the plan-dinner
// modal's "already assigned" state.

import { Clock, Flame, Star, UtensilsCrossed } from 'lucide-react'

export default function RecipeViewBody({ recipe }) {
  const last = recipe.lastCooked
    ? new Date(recipe.lastCooked + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  return (
    <div className="recipe-view">
      {recipe.favorite && (
        <p className="recipe-view-staple">
          <Star aria-hidden="true" size={14} /> Family staple
        </p>
      )}
      <h2 className="recipe-view-name">{recipe.name || ''}</h2>
      <div className="recipe-view-meta">
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
        {last && (
          <span>
            <UtensilsCrossed aria-hidden="true" size={13} /> Last made: {last}
          </span>
        )}
      </div>
      {(recipe.tags || []).length > 0 && (
        <div className="recipe-view-tags">
          {recipe.tags.map((t) => (
            <span className="tag-pill" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
      {(recipe.ingredients || []).length > 0 && (
        <>
          <p className="recipe-view-section">Ingredients</p>
          <ul className="recipe-view-ings">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                <span className="recipe-view-ing-amount">{ing.amount}</span>
                {ing.name}
              </li>
            ))}
          </ul>
        </>
      )}
      {recipe.notes && (
        <>
          <p className="recipe-view-section">Notes &amp; Instructions</p>
          <div className="recipe-view-notes">{recipe.notes}</div>
        </>
      )}
    </div>
  )
}
