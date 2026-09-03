// Planned dinners, keyed by date ('YYYY-MM-DD' doc id) → { recipeId,
// recipeName, updatedAt }. Exposes the map plus assign/clear actions.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const MealsContext = createContext(null)

export function MealsProvider({ children }) {
  const { user } = useAuth()
  const [meals, setMeals] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    if (!user) {
      setMeals({})
      setLoading(false)
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
        setLoading(false)
      },
      (err) => { console.error('meal plans listener failed:', err); setLoading(false); setError('Could not load your meal plans. Check your connection or sign in again.') },
    )
  }, [user])

  const value = useMemo(
    () => ({
      meals, loading, error,

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
          recipeId: null, recipeName: name, updatedAt: serverTimestamp(),
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
