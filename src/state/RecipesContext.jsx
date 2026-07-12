// The `recipes` collection — the family recipe box.
// Shape: { name, prep, cook, notes, favorite, tags[], ingredients[{amount,
// name}], lastCooked ('YYYY-MM-DD' or null), createdAt }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const RecipesContext = createContext(null)

export function RecipesProvider({ children }) {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])

  useEffect(() => {
    if (!user) {
      setRecipes([])
      return undefined
    }
    return onSnapshot(
      collection(db, 'recipes'),
      (snap) => setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Recipes listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      recipes,

      getRecipe(id) {
        return recipes.find((r) => r.id === id)
      },

      async addRecipe(data) {
        await addDoc(collection(db, 'recipes'), { ...data, createdAt: serverTimestamp() })
      },

      async updateRecipe(id, data) {
        await updateDoc(doc(db, 'recipes', id), data)
      },

      async deleteRecipe(id) {
        await deleteDoc(doc(db, 'recipes', id))
      },
    }),
    [recipes],
  )

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>
}

export function useRecipes() {
  return useContext(RecipesContext)
}
