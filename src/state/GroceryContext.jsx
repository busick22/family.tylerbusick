// The single grocery/current doc → { items: [{ name, checked, ... }] }.

import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const GroceryContext = createContext({ items: [] })

export function GroceryProvider({ children }) {
  const { user } = useAuth()
  const [grocery, setGrocery] = useState({ items: [] })

  useEffect(() => {
    if (!user) {
      setGrocery({ items: [] })
      return undefined
    }
    return onSnapshot(
      doc(db, 'grocery', 'current'),
      (snap) => setGrocery(snap.exists() ? snap.data() : { items: [] }),
      (err) => console.error('Grocery listener failed:', err),
    )
  }, [user])

  return <GroceryContext.Provider value={grocery}>{children}</GroceryContext.Provider>
}

export function useGrocery() {
  return useContext(GroceryContext)
}
