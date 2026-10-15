import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useMeals } from '../../state/MealsContext.jsx'
import { useRecipes } from '../../state/RecipesContext.jsx'
import { useGrocery } from '../../state/GroceryContext.jsx'
import { useAisles } from '../../state/AislesContext.jsx'
import { todayStr } from '../../lib/family.js'
import { dayLabel } from '../../lib/planning.js'
import { addMissingIngredients } from '../../lib/groceryPlanning.js'
import './meals.css'
import { useNotice } from '../../state/NoticeContext.jsx'

export default function GroceryTab() {
  const showNotice = useNotice()
  const { meals } = useMeals()
  const { getRecipe } = useRecipes()
  const grocery = useGrocery()
  const { getAisle, saveAisle } = useAisles()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [picked, setPicked] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editAisles, setEditAisles] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const eligible = Object.keys(meals)
    .filter((key) => key >= todayStr() && meals[key].recipeId && getRecipe(meals[key].recipeId))
    .sort()
  const selected = (picked || grocery.selectedDays).filter((key) => eligible.includes(key))
  async function save(items, days = selected) {
    if (grocery.loading || grocery.error) {
      showNotice('Wait until your grocery list has loaded before making changes.', 'error')
      return false
    }
    setBusy(true)
    try {
      await grocery.save(items, days)
      return true
    } catch {
      showNotice('Could not save groceries. Please try again.', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function addManual(event) {
    event.preventDefault()
    if (!name.trim()) return
    const item = {
      id: 'manual-' + crypto.randomUUID(),
      name: name.trim(),
      amount: amount.trim(),
      aisle: getAisle(name.trim()),
      checked: false,
      manual: true,
      sources: [],
    }
    if (await save([...grocery.items, item])) {
      setName('')
      setAmount('')
    }
  }
  async function addFromMeals() {
    const merged = new Map()
    selected.forEach((key) => {
      const recipe = getRecipe(meals[key].recipeId)
      recipe?.ingredients?.forEach((ingredient) => {
        const key = (ingredient.name || '').trim().toLowerCase()
        if (!key) return
        const current = merged.get(key) || { name: ingredient.name.trim(), amounts: [], sources: [] }
        if (ingredient.amount) current.amounts.push(ingredient.amount)
        current.sources.push(recipe.name)
        merged.set(key, current)
      })
    })
    const generated = [...merged].map(([key, item]) => ({
      id: 'ing-' + key,
      name: item.name,
      amount: item.amounts.join(' + '),
      sources: item.sources,
      checked: false,
      manual: false,
      aisle: getAisle(item.name),
    }))
    const next = addMissingIngredients(grocery.items, generated)
    if (await save(next))
      showNotice(
        next.length - grocery.items.length + ' new ingredients added. Existing items kept.',
        'success',
      )
  }
  const groups = new Map()
  grocery.items.forEach((item) => {
    const aisle = item.aisle || 'Other'
    if (!groups.has(aisle)) groups.set(aisle, [])
    groups.get(aisle).push(item)
  })
  const checked = grocery.items.filter((item) => item.checked).length
  return (
    <section className="workspace-surface grocery-panel">
      <div className="section-heading">
        <h2>Grocery list</h2>
        <span className="muted-copy">{grocery.items.length - checked} to pick up</span>
      </div>
      {grocery.error && (
        <p className="workspace-status" role="alert">
          {grocery.error}
        </p>
      )}
      {grocery.loading && (
        <p className="workspace-status" role="status">
          Loading groceries…
        </p>
      )}
      <form className="manual-add-row" onSubmit={addManual}>
        <input
          className="field"
          aria-label="Grocery item"
          placeholder="Add milk, apples, paper towels…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="field manual-amount-field"
          aria-label="Amount"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy || grocery.loading || Boolean(grocery.error)}>
          <Plus size={18} aria-hidden="true" /> Add
        </button>
      </form>
      <details className="grocery-source-picker">
        <summary>Add ingredients from meal plans</summary>
        <p className="empty-inline">
          Choose dinners below. Only missing ingredients are added; existing amounts and checkmarks stay as
          they are.
        </p>
        <div className="day-chips">
          {eligible.map((key) => (
            <button
              key={key}
              className="day-chip"
              data-selected={selected.includes(key)}
              aria-pressed={selected.includes(key)}
              onClick={() =>
                setPicked(selected.includes(key) ? selected.filter((day) => day !== key) : [...selected, key])
              }
            >
              <span className="day-chip-date">{dayLabel(key)}</span>
              <span className="day-chip-meal">{meals[key].recipeName}</span>
            </button>
          ))}
        </div>
        {!eligible.length && (
          <p className="empty-inline">No upcoming recipe-based dinners. You can still add groceries above.</p>
        )}
        <button className="btn" disabled={!selected.length || busy} onClick={addFromMeals}>
          Add missing ingredients
        </button>
      </details>
      {!grocery.loading && !grocery.error && !grocery.items.length && (
        <p className="empty-inline">Your list is clear. Add anything you need above.</p>
      )}
      {[...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([aisle, items]) => (
          <section key={aisle} className="work-group">
            <h2>{aisle}</h2>
            {items.map((item) => (
              <div className="work-row" key={item.id} data-done={item.checked}>
                <label className="work-check">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={busy}
                    aria-label={'Picked up ' + item.name}
                    onChange={() =>
                      save(
                        grocery.items.map((current) =>
                          current.id === item.id ? { ...current, checked: !current.checked } : current,
                        ),
                      )
                    }
                  />
                </label>
                <span className="work-edit">
                  <strong>{item.name}</strong>
                  {item.amount && <small>{item.amount}</small>}
                </span>
                {editAisles && (
                  <input
                    className="field grocery-aisle-field"
                    aria-label={'Aisle for ' + item.name}
                    defaultValue={item.aisle}
                    placeholder="Aisle"
                    disabled={busy}
                    onBlur={async (e) => {
                      const aisle = e.target.value.trim()
                      if (aisle === (item.aisle || '')) return
                      try {
                        await saveAisle(item.name, aisle)
                        await save(
                          grocery.items.map((current) =>
                            current.id === item.id ? { ...current, aisle } : current,
                          ),
                        )
                      } catch {
                        showNotice('Could not save the aisle.', 'error')
                      }
                    }}
                  />
                )}
                <button
                  className="icon-btn"
                  aria-label={'Remove ' + item.name}
                  disabled={busy}
                  onClick={() => save(grocery.items.filter((current) => current.id !== item.id))}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </section>
        ))}
      {grocery.items.length > 0 && (
        <details className="work-options">
          <summary>List options</summary>
          <div className="workspace-actions">
            <button
              className="btn"
              disabled={busy || !checked}
              onClick={() => save(grocery.items.filter((item) => !item.checked))}
            >
              Clear checked
            </button>
            <button className="btn" onClick={() => setEditAisles((value) => !value)}>
              {editAisles ? 'Done editing aisles' : 'Edit aisles'}
            </button>
            <button
              className={confirmClear ? 'btn btn-danger' : 'btn btn-ghost'}
              disabled={busy}
              onClick={async () => {
                if (!confirmClear) return setConfirmClear(true)
                if (await save([], [])) setConfirmClear(false)
              }}
            >
              {confirmClear ? 'Confirm clear entire list' : 'Clear entire list'}
            </button>
            {confirmClear && (
              <button className="btn" disabled={busy} onClick={() => setConfirmClear(false)}>
                Keep my list
              </button>
            )}
          </div>
          {confirmClear && (
            <p className="empty-inline">
              This removes every item, including the ones you added by hand. There is no undo.
            </p>
          )}
        </details>
      )}
    </section>
  )
}
