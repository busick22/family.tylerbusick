// Planned dinners, keyed by date ('YYYY-MM-DD' doc id) → { recipeId,
// recipeName, updatedAt }. Exposes the map plus assign/clear actions.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const MealsContext = createContext(null)

export function MealsProvider({ children }) {
  const { user } = useAuth()
  const [meals, setMeals] = useState({})

  useEffect(() => {
    if (!user) {
      setMeals({})
      return undefined
    }
    return onSnapshot(
      collection(db, 'meals'),
      (snap) => {
        const next = {}
        snap.docs.forEach((d) => {
          next[d.id] = d.data()
        })
        setMeals(next)
      },
      (err) => console.error('Meals listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      meals,

      // Assign a recipe to a day's dinner. Also stamps the recipe's
      // lastCooked date (same double-write the old app did).
      async assignMeal(dateKey, recipe) {
        await Promise.all([
          setDoc(doc(db, 'meals', dateKey), {
            recipeId: recipe.id,
            recipeName: recipe.name || '',
            updatedAt: serverTimestamp(),
          }),
          updateDoc(doc(db, 'recipes', recipe.id), { lastCooked: dateKey }),
        ])
      },

      async clearMeal(dateKey) {
        await deleteDoc(doc(db, 'meals', dateKey))
      },
    }),
    [meals],
  )

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>
}

export function useMeals() {
  return useContext(MealsContext)
}
