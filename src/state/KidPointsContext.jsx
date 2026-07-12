// The `kidPoints` collection — one doc per kid (doc id = kid name):
// { points, pendingRedemptions: [{ name, cost, requestedAt }],
//   redeemed: [{ name, cost, date, approvedAt }] }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { todayStr } from '../lib/family.js'

const KidPointsContext = createContext(null)

export function KidPointsProvider({ children }) {
  const { user } = useAuth()
  const [kidPoints, setKidPoints] = useState({})

  useEffect(() => {
    if (!user) {
      setKidPoints({})
      return undefined
    }
    return onSnapshot(
      collection(db, 'kidPoints'),
      (snap) => {
        const next = {}
        snap.docs.forEach((d) => {
          next[d.id] = d.data()
        })
        setKidPoints(next)
      },
      (err) => console.error('Kid points listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      kidPoints,

      // Reads the doc fresh before mutating so two parents approving from
      // two devices at once can't double-apply (same as the old app).
      async approveRedemption(kidName, index) {
        const ref = doc(db, 'kidPoints', kidName)
        const snap = await getDoc(ref)
        if (!snap.exists()) return null
        const data = snap.data()
        const pending = [...(data.pendingRedemptions || [])]
        const item = pending.splice(index, 1)[0]
        if (!item) return null
        const redeemed = [...(data.redeemed || []), { ...item, date: todayStr(), approvedAt: Date.now() }]
        await setDoc(ref, { ...data, pendingRedemptions: pending, redeemed }, { merge: true })
        return item
      },

      async denyRedemption(kidName, index) {
        const ref = doc(db, 'kidPoints', kidName)
        const snap = await getDoc(ref)
        if (!snap.exists()) return null
        const data = snap.data()
        const pending = [...(data.pendingRedemptions || [])]
        const item = pending.splice(index, 1)[0]
        if (!item) return null
        await setDoc(ref, { ...data, pendingRedemptions: pending }, { merge: true })
        return item
      },
    }),
    [kidPoints],
  )

  return <KidPointsContext.Provider value={value}>{children}</KidPointsContext.Provider>
}

export function useKidPoints() {
  return useContext(KidPointsContext)
}
