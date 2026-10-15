// Add/edit a recipe: name, prep/cook times, ingredient rows, tag chips,
// family-staple flag, and free-form notes. Delete uses the two-click
// confirm pattern from the sibling apps.

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useRecipes } from '../../state/RecipesContext.jsx'
import { useNotice } from '../../state/NoticeContext.jsx'

export default function RecipeModal({ recipe, onClose }) {
  const showNotice = useNotice()
  const { addRecipe, updateRecipe, deleteRecipe } = useRecipes()
  const editing = Boolean(recipe?.id)

  const [name, setName] = useState(recipe?.name || '')
  const [prep, setPrep] = useState(recipe?.prep || '')
  const [cook, setCook] = useState(recipe?.cook || '')
  const [notes, setNotes] = useState(recipe?.notes || '')
  const [favorite, setFavorite] = useState(Boolean(recipe?.favorite))
  const [tags, setTags] = useState(recipe?.tags ? [...recipe.tags] : [])
  const [tagDraft, setTagDraft] = useState('')
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients?.length ? recipe.ingredients.map((i) => ({ ...i })) : [{ amount: '', name: '' }],
  )
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  function setIngredient(index, field, value) {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function removeIngredient(index) {
    setIngredients((rows) => rows.filter((_, i) => i !== index))
  }

  function commitTag() {
    const v = tagDraft.replace(',', '').trim()
    if (v && !tags.includes(v)) setTags((t) => [...t, v])
    setTagDraft('')
  }

  function onTagKey(e) {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    commitTag()
  }

  async function save() {
    if (!name.trim()) {
      showNotice('Please enter a recipe name.', 'error')
      return
    }
    const data = {
      name: name.trim(),
      prep: prep.trim(),
      cook: cook.trim(),
      notes: notes.trim(),
      favorite,
      tags,
      ingredients: ingredients
        .map((i) => ({ amount: i.amount.trim(), name: i.name.trim() }))
        .filter((i) => i.name),
      lastCooked: recipe?.lastCooked || null,
    }
    setBusy(true)
    try {
      if (editing) await updateRecipe(recipe.id, data)
      else await addRecipe(data)
      showNotice('Recipe saved.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save that recipe.", 'error')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setBusy(true)
    try {
      await deleteRecipe(recipe.id)
      showNotice('Recipe deleted.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that recipe.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(560px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>{editing ? 'Edit Recipe' : 'Add Recipe'}</h3>

      <label className="field-label" htmlFor="recipe-name">
        Recipe name *
      </label>
      <input
        id="recipe-name"
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Grandma's Chili"
      />

      <div className="form-2col">
        <div>
          <label className="field-label" htmlFor="recipe-prep">
            Prep time
          </label>
          <input
            id="recipe-prep"
            className="field"
            value={prep}
            onChange={(e) => setPrep(e.target.value)}
            placeholder="15 min"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="recipe-cook">
            Cook time
          </label>
          <input
            id="recipe-cook"
            className="field"
            value={cook}
            onChange={(e) => setCook(e.target.value)}
            placeholder="45 min"
          />
        </div>
      </div>

      <span className="field-label">Ingredients</span>
      <div className="ing-rows">
        {ingredients.map((ing, i) => (
          <div className="ing-row" key={i}>
            <input
              className="field ing-amount-field"
              value={ing.amount}
              onChange={(e) => setIngredient(i, 'amount', e.target.value)}
              placeholder="Amount"
              aria-label={`Ingredient ${i + 1} amount`}
            />
            <input
              className="field"
              value={ing.name}
              onChange={(e) => setIngredient(i, 'name', e.target.value)}
              placeholder="Ingredient"
              aria-label={`Ingredient ${i + 1} name`}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => removeIngredient(i)}
              aria-label={`Remove ingredient ${i + 1}`}
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setIngredients((rows) => [...rows, { amount: '', name: '' }])}
      >
        <Plus aria-hidden="true" size={15} /> Add ingredient
      </button>

      <label className="field-label" htmlFor="recipe-tags" style={{ marginTop: 14 }}>
        Tags
      </label>
      <div className="tag-editor">
        {tags.map((t) => (
          <span className="tag-pill tag-pill-edit" key={t}>
            {t}
            <button
              type="button"
              onClick={() => setTags((cur) => cur.filter((x) => x !== t))}
              aria-label={`Remove tag ${t}`}
            >
              <X aria-hidden="true" size={12} />
            </button>
          </span>
        ))}
        <input
          id="recipe-tags"
          className="tag-editor-field"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={onTagKey}
          onBlur={commitTag}
          placeholder={tags.length ? 'Add another…' : 'Type a tag, press Enter…'}
        />
      </div>

      <label className="check-row">
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
        Favorite family staple
      </label>

      <label className="field-label" htmlFor="recipe-notes">
        Notes / instructions
      </label>
      <textarea
        id="recipe-notes"
        className="field recipe-notes-field"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Steps, tips, or notes…"
      />

      <div className="modal-actions">
        {editing && (
          <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
            {confirmingDelete ? 'Really delete?' : 'Delete'}
          </button>
        )}
        <span className="modal-actions-gap" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          Save recipe
        </button>
      </div>
    </Modal>
  )
}
