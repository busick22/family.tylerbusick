// The `chores` collection — recurring, day-of-week assigned duties.

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeAssignment } from '../lib/family.js'

const ChoresContext = createContext([])

export function ChoresProvider({ children }) {
  const { user } = useAuth()
  const [chores, setChores] = useState([])

  useEffect(() => {
    if (!user) {
      setChores([])
      return undefined
    }
    return onSnapshot(
      collection(db, 'chores'),
      (snap) => setChores(snap.docs.map((d) => normalizeAssignment({ id: d.id, ...d.data() }))),
      (err) => console.error('Chores listener failed:', err),
    )
  }, [user])

  return <ChoresContext.Provider value={chores}>{children}</ChoresContext.Provider>
}

export function useChores() {
  return useContext(ChoresContext)
}
