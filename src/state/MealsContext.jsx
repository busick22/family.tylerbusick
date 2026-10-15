// Planned dinners, keyed by date ('YYYY-MM-DD' doc id) → { recipeId,
// recipeName, updatedAt }. Exposes the map plus assign/clear actions.

import { createContext, useContext, useMemo } from 'react'
import { deleteDoc, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'

const MealsContext = createContext(null)

export function MealsProvider({ children }) {
  const { user } = useAuth()
  const {
    items: meals,
    loading,
    error,
  } = useCollection(user, 'meals', 'your meal plans', { toMap: (d) => d.data() })

  const value = useMemo(
    () => ({
      meals,
      loading,
      error,

      // Assign a recipe to a day's dinner. Also stamps the recipe's
      // lastCooked date (same double-write the old app did).
      async assignMeal(dateKey, recipe) {
        const batch = writeBatch(db)
        batch.set(doc(db, 'meals', dateKey), {
          recipeId: recipe.id,
          recipeName: recipe.name || '',
          updatedAt: serverTimestamp(),
        })
        batch.update(doc(db, 'recipes', recipe.id), { lastCooked: dateKey })
        await batch.commit()
      },

      async clearMeal(dateKey) {
        await deleteDoc(doc(db, 'meals', dateKey))
      },

      async saveSimpleMeal(dateKey, name) {
        await setDoc(doc(db, 'meals', dateKey), {
          recipeId: null,
          recipeName: name,
          updatedAt: serverTimestamp(),
        })
      },
    }),
    [meals, loading, error],
  )

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>
}

export function useMeals() {
  return useContext(MealsContext)
}
