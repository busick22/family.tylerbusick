// The `aisles` collection — remembered store-aisle assignments so the
// grocery list groups itself the way the family actually shops. Doc id is
// the normalized ingredient name; data is { aisle, name }.

import { createContext, useContext, useMemo } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'

const AislesContext = createContext(null)

function aisleKey(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '-')
}

export function AislesProvider({ children }) {
  const { user } = useAuth()
  const {
    items: aisles,
    loading,
    error,
  } = useCollection(user, 'aisles', 'store aisles', { toMap: (d) => d.data().aisle })

  const value = useMemo(
    () => ({
      loading,
      error,

      getAisle(name) {
        return aisles[aisleKey(name)] || ''
      },

      // "Type aisle — saved forever": remembers the aisle for this
      // ingredient name so every future list groups it automatically.
      async saveAisle(name, aisle) {
        await setDoc(doc(db, 'aisles', aisleKey(name)), { aisle, name })
      },
    }),
    [aisles, loading, error],
  )

  return <AislesContext.Provider value={value}>{children}</AislesContext.Provider>
}

export function useAisles() {
  return useContext(AislesContext)
}
