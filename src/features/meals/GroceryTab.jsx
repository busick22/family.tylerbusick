// Grocery tab: pick upcoming planned-dinner days, build a merged shopping
// list from their ingredients (grouped by remembered store aisle), then
// check things off at the store.

import { useMemo, useState } from 'react'
import { ShoppingCart, Store, X, Plus } from 'lucide-react'
import { useMeals } from '../../state/MealsContext.jsx'
import { useRecipes } from '../../state/RecipesContext.jsx'
import { useGrocery } from '../../state/GroceryContext.jsx'
import { useAisles } from '../../state/AislesContext.jsx'
import { todayStr } from '../../lib/family.js'

export default function GroceryTab({ showNotice }) {
  const { meals } = useMeals()
  const { getRecipe } = useRecipes()
  const grocery = useGrocery()
  const { getAisle, saveAisle } = useAisles()
  const [manualName, setManualName] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)

  // Days that still make sense to shop for: today or later, with a dinner.
  const eligibleKeys = useMemo(() => {
    const today = todayStr()
    return Object.keys(meals).filter((dk) => dk >= today).sort()
  }, [meals])

  // Drop stale selections (past days, removed meals) at read time.
  const selectedDays = useMemo(
    () => grocery.selectedDays.filter((dk) => eligibleKeys.includes(dk)),
    [grocery.selectedDays, eligibleKeys],
  )

  async function persist(nextItems, nextDays) {
    try {
      await grocery.save(nextItems, nextDays)
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save the grocery list.", 'error')
    }
  }

  function toggleDay(dk) {
    const next = selectedDays.includes(dk)
      ? selectedDays.filter((x) => x !== dk)
      : [...selectedDays, dk]
    persist(grocery.items, next)
  }

  function buildList() {
    if (!selectedDays.length) {
      showNotice('Please select at least one day.', 'error')
      return
    }
    const merged = {}
    selectedDays.forEach((dk) => {
      const meal = meals[dk]
      if (!meal) return
      const r = getRecipe(meal.recipeId)
      if (!r) return
      ;(r.ingredients || []).forEach((ing) => {
        if (!ing.name) return
        const key = ing.name.toLowerCase().trim()
        if (!merged[key]) {
          merged[key] = { name: ing.name, amounts: [], sources: [] }
        }
        if (ing.amount) merged[key].amounts.push(ing.amount)
        merged[key].sources.push(r.name)
      })
    })
    const items = Object.entries(merged).map(([key, item], i) => ({
      id: `ing-${i}-${key}`,
      name: item.name,
      amount: item.amounts.join(' + '),
      aisle: getAisle(item.name),
      checked: false,
      manual: false,
      sources: item.sources,
    }))
    persist(items, selectedDays)
    showNotice('Grocery list built from selected meals.', 'success')
  }

  function toggleItem(id) {
    persist(
      grocery.items.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)),
      selectedDays,
    )
  }

  function removeItem(id) {
    persist(grocery.items.filter((x) => x.id !== id), selectedDays)
  }

  async function changeAisle(id, aisle) {
    const item = grocery.items.find((x) => x.id === id)
    if (!item) return
    const trimmed = aisle.trim()
    try {
      await saveAisle(item.name, trimmed)
    } catch (e) {
      console.error(e)
    }
    persist(
      grocery.items.map((x) => (x.id === id ? { ...x, aisle: trimmed } : x)),
      selectedDays,
    )
  }

  function clearChecked() {
    persist(grocery.items.filter((x) => !x.checked), selectedDays)
  }

  function startOver() {
    if (!confirmingClear) {
      setConfirmingClear(true)
      return
    }
    setConfirmingClear(false)
    persist([], [])
    showNotice('Grocery list cleared.', 'success')
  }

  function addManual() {
    const name = manualName.trim()
    if (!name) return
    persist(
      [
        ...grocery.items,
        {
          id: `manual-${Date.now()}`,
          name,
          amount: manualAmount.trim(),
          aisle: getAisle(name),
          checked: false,
          manual: true,
          sources: [],
        },
      ],
      selectedDays,
    )
    setManualName('')
    setManualAmount('')
  }

  // Group items by aisle, unassigned last.
  const groups = useMemo(() => {
    const byAisle = {}
    grocery.items.forEach((item) => {
      const a = item.aisle || '__other'
      if (!byAisle[a]) byAisle[a] = []
      byAisle[a].push(item)
    })
    return Object.keys(byAisle)
      .sort((a, b) => {
        if (a === '__other') return 1
        if (b === '__other') return -1
        return a.localeCompare(b)
      })
      .map((a) => ({ aisle: a, items: byAisle[a] }))
  }, [grocery.items])

  const checkedCount = grocery.items.filter((x) => x.checked).length

  return (
    <div className="grocery-tab">
      <div className="card grocery-panel">
        <div className="panel-title">Choose days to shop for</div>
        {eligibleKeys.length ? (
          <>
            <div className="day-chips">
              {eligibleKeys.map((dk) => {
                const meal = meals[dk]
                const [y, m, d] = dk.split('-').map(Number)
                const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
                return (
                  <button
                    type="button"
                    className="day-chip"
                    data-selected={selectedDays.includes(dk)}
                    key={dk}
                    onClick={() => toggleDay(dk)}
                  >
                    <span className="day-chip-date">{label}</span>
                    <span className="day-chip-meal">{meal.recipeName}</span>
                  </button>
                )
              })}
            </div>
            <div className="grocery-actions-row">
              <button className="btn btn-primary" onClick={buildList}>
                <ShoppingCart aria-hidden="true" size={16} /> Build list
              </button>
              <button className="btn btn-sm" onClick={() => persist(grocery.items, [...eligibleKeys])}>
                All days
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => persist(grocery.items, [])}>
                Clear
              </button>
            </div>
          </>
        ) : (
          <p className="grocery-none">
            No meals planned for today or later yet. Add some on the Schedule tab!
          </p>
        )}
      </div>

      {grocery.items.length > 0 && (
        <div className="card grocery-panel">
          <div className="grocery-list-head">
            <div className="panel-title">Grocery list</div>
            <div className="grocery-actions-row">
              {checkedCount > 0 && (
                <button className="btn btn-sm" onClick={clearChecked}>
                  ✓ Clear checked
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={startOver}>
                {confirmingClear ? 'Really clear all?' : 'Start over'}
              </button>
              <span className="grocery-count">
                {checkedCount} of {grocery.items.length} checked
              </span>
            </div>
          </div>

          {groups.map((g) => (
            <div className="aisle-group" key={g.aisle}>
              <div className="aisle-title">
                <Store aria-hidden="true" size={13} />
                {g.aisle === '__other' ? 'Other / Unassigned' : g.aisle}
              </div>
              {g.items.map((item) => (
                <div className="grocery-item" data-checked={item.checked} key={item.id}>
                  <input
                    type="checkbox"
                    className="grocery-check"
                    checked={item.checked}
                    onChange={() => toggleItem(item.id)}
                    aria-label={`Toggle ${item.name}`}
                  />
                  <span className="grocery-amount">{item.amount}</span>
                  <div className="grocery-name">
                    {item.name}
                    {item.sources?.length > 0 && (
                      <span className="grocery-sources">From: {item.sources.join(', ')}</span>
                    )}
                  </div>
                  <input
                    className="grocery-aisle-field"
                    defaultValue={item.aisle}
                    placeholder="aisle…"
                    title="Type aisle — saved forever!"
                    aria-label={`Aisle for ${item.name}`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (item.aisle || '')) changeAisle(item.id, e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur()
                    }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                </div>
              ))}
            </div>
          ))}

          <div className="manual-add-row">
            <input
              className="field"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addManual()
              }}
              placeholder="Add item manually…"
              aria-label="Manual item name"
            />
            <input
              className="field manual-amount-field"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addManual()
              }}
              placeholder="Amount"
              aria-label="Manual item amount"
            />
            <button className="btn btn-sm" onClick={addManual}>
              <Plus aria-hidden="true" size={15} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
