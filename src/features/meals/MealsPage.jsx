import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarRange, BookOpen, ShoppingCart, Plus } from 'lucide-react'
import Notice, { useNotice } from '../../components/Notice.jsx'
import { useRecipes } from '../../state/RecipesContext.jsx'
import RecipesTab from './RecipesTab.jsx'
import GroceryTab from './GroceryTab.jsx'
import RecipeModal from './RecipeModal.jsx'
import RecipeViewModal from './RecipeViewModal.jsx'
import CookModal from './CookModal.jsx'
import MealWeek from './MealWeek.jsx'
import './meals.css'

export default function MealsPage() {
  const { getRecipe } = useRecipes()
  const [params, setParams] = useSearchParams()
  const tab = ['recipes', 'grocery'].includes(params.get('tab')) ? params.get('tab') : 'schedule'
  function setTab(next) { setParams(previous => { const copy = new URLSearchParams(previous); copy.set('tab', next); return copy }) }
  const [notice, showNotice] = useNotice()
  const [editRecipe, setEditRecipe] = useState(undefined)
  const [viewId, setViewId] = useState(null)
  const [cookId, setCookId] = useState(null)
  const viewRecipe = viewId ? getRecipe(viewId) : null
  const cookRecipe = cookId ? getRecipe(cookId) : null
  return <div className="page page-enter" data-page="meals">
    <Notice notice={notice} />
    <header className="workspace-title"><h1>Meals</h1>
      {tab === 'schedule' && <button className="btn" onClick={() => setParams(previous => { const copy = new URLSearchParams(previous); if (copy.get('view') === 'month') copy.delete('view'); else copy.set('view', 'month'); return copy })}>{params.get('view') === 'month' ? 'Week view' : 'Month overview'}</button>}
      {tab === 'recipes' && <button className="btn btn-primary" onClick={() => setEditRecipe(null)}><Plus size={18} aria-hidden="true" /> New recipe</button>}
    </header>
    <nav className="seg-tabs" aria-label="Meals sections">
      {[['schedule', 'Meal plan', CalendarRange], ['grocery', 'Groceries', ShoppingCart], ['recipes', 'Recipes', BookOpen]].map(([value, label, Icon]) =>
        <button key={value} className="seg-tab" data-active={tab === value} aria-pressed={tab === value} onClick={() => setTab(value)}><Icon size={18} aria-hidden="true" />{label}</button>)}
    </nav>
    {tab === 'schedule' && <MealWeek showNotice={showNotice} onCook={setCookId} />}
    {tab === 'recipes' && <RecipesTab onView={setViewId} onAdd={() => setEditRecipe(null)} />}
    {tab === 'grocery' && <GroceryTab showNotice={showNotice} />}
    {editRecipe !== undefined && <RecipeModal recipe={editRecipe} onClose={() => setEditRecipe(undefined)} showNotice={showNotice} />}
    {viewRecipe && <RecipeViewModal recipe={viewRecipe} onClose={() => setViewId(null)} onCook={() => { setViewId(null); setCookId(viewRecipe.id) }} onEdit={() => { setViewId(null); setEditRecipe(viewRecipe) }} />}
    {cookRecipe && <CookModal recipe={cookRecipe} onClose={() => setCookId(null)} />}
  </div>
}
