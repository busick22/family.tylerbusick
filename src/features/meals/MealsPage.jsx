// Meals — port of the old recipes.html/js. Three tabs (Schedule, Recipes,
// Grocery) plus a floating + button that quick-adds a recipe, a planned
// dinner, or a grocery item.

import { useState } from 'react'
import { CalendarRange, BookOpen, ShoppingCart, Plus, X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import Notice, { useNotice } from '../../components/Notice.jsx'
import { useRecipes } from '../../state/RecipesContext.jsx'
import { todayStr } from '../../lib/family.js'
import ScheduleTab from './ScheduleTab.jsx'
import RecipesTab from './RecipesTab.jsx'
import GroceryTab from './GroceryTab.jsx'
import RecipeModal from './RecipeModal.jsx'
import RecipeViewModal from './RecipeViewModal.jsx'
import CookModal from './CookModal.jsx'
import PlanDinnerModal from './PlanDinnerModal.jsx'
import GroceryAddModal from './GroceryAddModal.jsx'
import './meals.css'

const TABS = [
  { id: 'schedule', label: 'Schedule', icon: CalendarRange },
  { id: 'recipes', label: 'Recipes', icon: BookOpen },
  { id: 'grocery', label: 'Grocery', icon: ShoppingCart },
]

export default function MealsPage() {
  const { getRecipe } = useRecipes()
  const [notice, showNotice] = useNotice()
  const [tab, setTab] = useState('schedule')

  // Which modal is open. `editRecipe`: undefined = closed, null = new
  // recipe, object = editing that recipe.
  const [editRecipe, setEditRecipe] = useState(undefined)
  const [viewId, setViewId] = useState(null)
  const [cookId, setCookId] = useState(null)
  const [planDate, setPlanDate] = useState(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [groceryAddOpen, setGroceryAddOpen] = useState(false)

  const viewRecipe = viewId ? getRecipe(viewId) : null
  const cookRecipe = cookId ? getRecipe(cookId) : null

  function quickAdd(kind) {
    setQuickAddOpen(false)
    if (kind === 'recipe') setEditRecipe(null)
    if (kind === 'meal') setPlanDate(todayStr())
    if (kind === 'grocery') setGroceryAddOpen(true)
  }

  return (
    <div className="page page-enter" data-page="meals" data-scroll="locked">
      <Notice notice={notice} />

      <header className="page-head">
        <h1 className="page-title">
          Meals
          <small>Recipes, calendar &amp; grocery list</small>
        </h1>
      </header>

      <nav className="seg-tabs" aria-label="Meals sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className="seg-tab"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon aria-hidden="true" size={17} />
            {label}
          </button>
        ))}
      </nav>

      <div className="page-scroll meals-scroll">
        {tab === 'schedule' && <ScheduleTab onPickDay={setPlanDate} showNotice={showNotice} />}
        {tab === 'recipes' && (
          <RecipesTab onView={setViewId} onAdd={() => setEditRecipe(null)} />
        )}
        {tab === 'grocery' && <GroceryTab showNotice={showNotice} />}
      </div>

      <button className="fab" onClick={() => setQuickAddOpen(true)} aria-label="Add">
        <Plus aria-hidden="true" />
      </button>

      {editRecipe !== undefined && (
        <RecipeModal
          recipe={editRecipe}
          onClose={() => setEditRecipe(undefined)}
          showNotice={showNotice}
        />
      )}

      {viewRecipe && (
        <RecipeViewModal
          recipe={viewRecipe}
          onClose={() => setViewId(null)}
          onCook={() => {
            setViewId(null)
            setCookId(viewRecipe.id)
          }}
          onEdit={() => {
            setViewId(null)
            setEditRecipe(viewRecipe)
          }}
        />
      )}

      {cookRecipe && <CookModal recipe={cookRecipe} onClose={() => setCookId(null)} />}

      {planDate && (
        <PlanDinnerModal
          dateKey={planDate}
          onClose={() => setPlanDate(null)}
          showNotice={showNotice}
        />
      )}

      {groceryAddOpen && (
        <GroceryAddModal onClose={() => setGroceryAddOpen(false)} showNotice={showNotice} />
      )}

      {quickAddOpen && (
        <Modal onClose={() => setQuickAddOpen(false)} width="min(420px, 100%)">
          <button
            className="icon-btn modal-close"
            onClick={() => setQuickAddOpen(false)}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </button>
          <h3>Add</h3>
          <div className="quick-add-actions">
            <button type="button" className="quick-add-action" onClick={() => quickAdd('recipe')}>
              <BookOpen aria-hidden="true" /> Recipe
            </button>
            <button type="button" className="quick-add-action" onClick={() => quickAdd('meal')}>
              <CalendarRange aria-hidden="true" /> Plan dinner
            </button>
            <button type="button" className="quick-add-action" onClick={() => quickAdd('grocery')}>
              <ShoppingCart aria-hidden="true" /> Grocery item
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
