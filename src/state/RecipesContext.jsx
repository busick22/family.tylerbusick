// The `recipes` collection — the family recipe box.
// Shape: { name, prep, cook, notes, favorite, tags[], ingredients[{amount,
// name}], lastCooked ('YYYY-MM-DD' or null), createdAt }.

import { createContext, useContext, useMemo } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'

const RecipesContext = createContext(null)

export function RecipesProvider({ children }) {
  const { user } = useAuth()
  const { items: recipes, loading, error } = useCollection(user, 'recipes', 'recipes')

  const value = useMemo(
    () => ({
      recipes,
      loading,
      error,

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
    [recipes, loading, error],
  )

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>
}

export function useRecipes() {
  return useContext(RecipesContext)
}
