// The single grocery/current doc → { items: [{ id, name, amount, aisle,
// checked, manual, sources[] }], selectedDays: ['YYYY-MM-DD'] }. The whole
// doc is rewritten on every change (same as the old app — the list is
// small and this keeps every device in sync via the snapshot listener).

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const GroceryContext = createContext(null)

const EMPTY = { items: [], selectedDays: [] }

export function GroceryProvider({ children }) {
  const { user } = useAuth()
  const [grocery, setGrocery] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    if (!user) {
      setGrocery(EMPTY)
      setLoading(false)
      return undefined
    }
    return onSnapshot(
      doc(db, 'grocery', 'current'),
      (snap) => {
        const data = snap.exists() ? snap.data() : EMPTY
        setLoading(false)
        setGrocery({
          items: Array.isArray(data.items) ? data.items : [],
          selectedDays: Array.isArray(data.selectedDays) ? data.selectedDays : [],
        })
      },
      (err) => { console.error('Grocery listener failed:', err); setLoading(false); setError('Could not load groceries. Check your connection or sign in again.') },
    )
  }, [user])

  const value = useMemo(
    () => ({
      items: grocery.items,
      loading, error,
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
