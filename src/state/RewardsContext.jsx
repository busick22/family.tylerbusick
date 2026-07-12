// The `rewards` collection — the points-for-prizes catalog. Shape: { name,
// cost, archived, createdAt }. Removal archives instead of deleting so
// past redemptions keep their history.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const RewardsContext = createContext(null)

export function RewardsProvider({ children }) {
  const { user } = useAuth()
  const [rewards, setRewards] = useState([])

  useEffect(() => {
    if (!user) {
      setRewards([])
      return undefined
    }
    return onSnapshot(
      collection(db, 'rewards'),
      (snap) => setRewards(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Rewards listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      rewards,
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
    [rewards],
  )

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>
}

export function useRewards() {
  return useContext(RewardsContext)
}
