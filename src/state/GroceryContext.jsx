// The single grocery/current doc → { items: [{ id, name, amount, aisle,
// checked, manual, sources[] }], selectedDays: ['YYYY-MM-DD'] }. The whole
// doc is rewritten on every change (same as the old app — the list is
// small and this keeps every device in sync via the snapshot listener).

import { createContext, useContext, useMemo } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useDocument } from './useCollection.js'

const GroceryContext = createContext(null)

const EMPTY = { items: [], selectedDays: [] }

export function GroceryProvider({ children }) {
  const { user } = useAuth()
  const {
    data: grocery,
    loading,
    error,
  } = useDocument(
    user,
    'grocery',
    'current',
    'groceries',
    (snap) => {
      const data = snap.exists() ? snap.data() : EMPTY
      return {
        items: Array.isArray(data.items) ? data.items : [],
        selectedDays: Array.isArray(data.selectedDays) ? data.selectedDays : [],
      }
    },
    EMPTY,
  )

  const value = useMemo(
    () => ({
      items: grocery.items,
      loading,
      error,
      selectedDays: grocery.selectedDays,

      async save(nextItems, nextSelectedDays) {
        // Firestore's snapshot listener owns the optimistic/rollback state.
        await setDoc(doc(db, 'grocery', 'current'), {
          items: nextItems,
          selectedDays: nextSelectedDays,
          updatedAt: serverTimestamp(),
        })
      },
    }),
    [grocery, loading, error],
  )

  return <GroceryContext.Provider value={value}>{children}</GroceryContext.Provider>
}

export function useGrocery() {
  return useContext(GroceryContext)
}
