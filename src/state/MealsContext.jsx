// Planned meals, keyed by date ('YYYY-MM-DD' doc id) → { recipeName, ... }.

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const MealsContext = createContext({})

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

  return <MealsContext.Provider value={meals}>{children}</MealsContext.Provider>
}

export function useMeals() {
  return useContext(MealsContext)
}
