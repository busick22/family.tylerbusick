// The `rewards` collection — the points-for-prizes catalog. Shape: { name,
// cost, archived, createdAt }. Removal archives instead of deleting so
// past redemptions keep their history.

import { createContext, useContext, useMemo } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'

const RewardsContext = createContext(null)

export function RewardsProvider({ children }) {
  const { user } = useAuth()
  const { items: rewards, loading, error } = useCollection(user, 'rewards', 'rewards')

  const value = useMemo(
    () => ({
      rewards,
      loading,
      error,
      activeRewards: rewards.filter((r) => !r.archived),

      async addReward(name, cost) {
        await addDoc(collection(db, 'rewards'), {
          name,
          cost,
          archived: false,
          createdAt: serverTimestamp(),
        })
      },

      async archiveReward(id) {
        await updateDoc(doc(db, 'rewards', id), { archived: true })
      },
    }),
    [rewards, loading, error],
  )

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>
}

export function useRewards() {
  return useContext(RewardsContext)
}
