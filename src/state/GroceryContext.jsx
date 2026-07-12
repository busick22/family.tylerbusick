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

  useEffect(() => {
    if (!user) {
      setGrocery(EMPTY)
      return undefined
    }
    return onSnapshot(
      doc(db, 'grocery', 'current'),
      (snap) => {
        const data = snap.exists() ? snap.data() : EMPTY
        setGrocery({
          items: Array.isArray(data.items) ? data.items : [],
          selectedDays: Array.isArray(data.selectedDays) ? data.selectedDays : [],
        })
      },
      (err) => console.error('Grocery listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      items: grocery.items,
      selectedDays: grocery.selectedDays,

      async save(nextItems, nextSelectedDays) {
        // Update local state immediately so the UI doesn't wait on the
        // network round-trip; the snapshot listener confirms after.
        setGrocery({ items: nextItems, selectedDays: nextSelectedDays })
        await setDoc(doc(db, 'grocery', 'current'), {
          items: nextItems,
          selectedDays: nextSelectedDays,
          updatedAt: serverTimestamp(),
        })
      },
    }),
    [grocery],
  )

  return <GroceryContext.Provider value={value}>{children}</GroceryContext.Provider>
}

export function useGrocery() {
  return useContext(GroceryContext)
}
