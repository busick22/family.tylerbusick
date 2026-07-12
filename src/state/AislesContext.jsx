// The `aisles` collection — remembered store-aisle assignments so the
// grocery list groups itself the way the family actually shops. Doc id is
// the normalized ingredient name; data is { aisle, name }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const AislesContext = createContext(null)

function aisleKey(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '-')
}

export function AislesProvider({ children }) {
  const { user } = useAuth()
  const [aisles, setAisles] = useState({})

  useEffect(() => {
    if (!user) {
      setAisles({})
      return undefined
    }
    return onSnapshot(
      collection(db, 'aisles'),
      (snap) => {
        const next = {}
        snap.docs.forEach((d) => {
          next[d.id] = d.data().aisle
        })
        setAisles(next)
      },
      (err) => console.error('Aisles listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      getAisle(name) {
        return aisles[aisleKey(name)] || ''
      },

      // "Type aisle — saved forever": remembers the aisle for this
      // ingredient name so every future list groups it automatically.
      async saveAisle(name, aisle) {
        await setDoc(doc(db, 'aisles', aisleKey(name)), { aisle, name })
      },
    }),
    [aisles],
  )

  return <AislesContext.Provider value={value}>{children}</AislesContext.Provider>
}

export function useAisles() {
  return useContext(AislesContext)
}
