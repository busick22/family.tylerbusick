// Recipes tab: searchable, tag-filterable grid of recipe cards.

import { useMemo, useState } from 'react'
import { Search, Star, Clock, Flame, Plus, CookingPot } from 'lucide-react'
import { useRecipes } from '../../state/RecipesContext.jsx'

export default function RecipesTab({ onView, onAdd }) {
  const { recipes } = useRecipes()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)

  const allTags = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.tags || []))].sort(),
    [recipes],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return recipes
      .filter((r) => {
        const hay = [
          r.name || '',
          r.notes || '',
          ...(r.tags || []),
          ...(r.ingredients || []).map((i) => i.name || ''),
        ]
          .join(' ')
          .toLowerCase()
        return (!q || hay.includes(q)) && (!activeTag || (r.tags || []).includes(activeTag))
      })
      .sort((a, b) => {
        if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1
        return (a.name || '').localeCompare(b.name || '')
      })
  }, [recipes, query, activeTag])

  return (
    <div className="recipes-tab">
      <div className="recipes-toolbar">
        <div className="search-wrap">
          <Search aria-hidden="true" size={16} />
          <input
            className="field search-field"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes…"
            aria-label="Search recipes"
          />
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus aria-hidden="true" size={16} /> Add recipe
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter-bar">
          <button
            type="button"
            className="chip"
            data-active={!activeTag}
            onClick={() => setActiveTag(null)}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              type="button"
              className="chip"
              data-active={activeTag === t}
              key={t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {filtered.length ? (
        <div className="recipe-grid">
          {filtered.map((r) => {
            const last = r.lastCooked
              ? new Date(r.lastCooked + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : ''
            return (
              <button
                type="button"
                className="card recipe-card"
                key={r.id}
                onClick={() => onView(r.id)}
                aria-label={`View recipe: ${r.name || ''}${r.favorite ? ' (family staple)' : ''}`}
              >
                <span className="recipe-card-name">
                  {r.favorite && <Star aria-hidden="true" size={14} className="recipe-star" />}
                  {r.name}
                </span>
                <span className="recipe-card-meta">
                  {r.prep && (
                    <span>
                      <Clock aria-hidden="true" size={12} /> {r.prep}
                    </span>
                  )}
                  {r.cook && (
                    <span>
                      <Flame aria-hidden="true" size={12} /> {r.cook}
                    </span>
                  )}
                  {last && <span>Last: {last}</span>}
                </span>
                {(r.tags || []).length > 0 && (
                  <span className="recipe-card-tags">
                    {r.tags.map((t) => (
                      <span className="tag-pill" key={t}>{t}</span>
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <CookingPot aria-hidden="true" />
          <p>{recipes.length ? 'No recipes match your search.' : 'No recipes yet — add your first one!'}</p>
        </div>
      )}
    </div>
  )
}
