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

      // Net balance: everything earned minus everything redeemed.
      getBalance(kidName) {
        const data = kidPoints[kidName]
        if (!data) return 0
        const earned = (data.history || []).reduce((s, e) => s + (e.points || 0), 0)
        const redeemed = (data.redeemed || []).reduce((s, e) => s + (e.cost || 0), 0)
        return Math.max(0, earned - redeemed)
      },

      async awardPoints(kidName, pts, label, type, refId) {
        if (!pts || pts <= 0) return
        const ref = doc(db, 'kidPoints', kidName)
        const snap = await getDoc(ref)
        const existing = snap.exists() ? snap.data() : { history: [], redeemed: [] }
        const history = [...(existing.history || [])]
        history.push({ points: pts, label, type, refId, date: todayStr(), ts: Date.now() })
        await setDoc(ref, { ...existing, history }, { merge: true })
      },

      // Undo of an award: remove the most recent matching history entry.
      async revokePoints(kidName, type, refId) {
        if (!kidName) return
        const ref = doc(db, 'kidPoints', kidName)
        const snap = await getDoc(ref)
        if (!snap.exists()) return
        const existing = snap.data()
        const history = [...(existing.history || [])]
        let removeIdx = -1
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i]?.type === type && history[i]?.refId === refId) {
            removeIdx = i
            break
          }
        }
        if (removeIdx < 0) return
        history.splice(removeIdx, 1)
        await setDoc(ref, { ...existing, history }, { merge: true })
      },

      async deleteHistoryEntry(kidName, index) {
        const ref = doc(db, 'kidPoints', kidName)
        const snap = await getDoc(ref)
        if (!snap.exists()) return
        const data = snap.data()
        const history = [...(data.history || [])]
        history.splice(index, 1)
        await setDoc(ref, { ...data, history }, { merge: true })
      },

      // Wipes earned + redeemed history for the given kids.
      async resetKids(kidNames) {
        await Promise.all(
          kidNames.map((n) =>
            setDoc(doc(db, 'kidPoints', n), { history: [], redeemed: [], pendingRedemptions: [] }),
          ),
        )
      },

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
