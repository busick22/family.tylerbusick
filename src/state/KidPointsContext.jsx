// The `kidPoints` collection — one doc per kid (doc id = kid name):
// { points, pendingRedemptions: [{ name, cost, requestedAt }],
//   redeemed: [{ name, cost, date, approvedAt }] }.
//
// Every mutation below runs in a transaction and writes ONLY the arrays it
// owns. That matters because `history` is also written by
// lib/workCompletion.js whenever a chore or task is checked off: a parent
// approving a reward at the same moment a kid completes a chore used to read
// the document, then write the whole thing back, silently discarding the
// points that landed in between.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { todayStr } from '../lib/family.js'

const KidPointsContext = createContext(null)

// History entries carry a `ts` stamp from when they were awarded. Prefer it
// over the array index the UI happened to render, so removing an entry can't
// remove a different one that shifted position in the meantime.
function stampOf(entry) {
  return entry?.ts ?? entry?.requestedAt ?? null
}
function sameEntry(a, b) {
  return (a?.label ?? a?.name) === (b?.label ?? b?.name) && (a?.points ?? a?.cost) === (b?.points ?? b?.cost)
}
function findEntry(list, index, expected) {
  if (!expected) return list[index] ? index : -1
  const stamp = stampOf(expected)
  if (stamp != null) {
    const byStamp = list.findIndex((e) => stampOf(e) === stamp)
    if (byStamp >= 0) return byStamp
  }
  return list[index] && sameEntry(list[index], expected) ? index : -1
}

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
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          const history = [...(snap.data()?.history || [])]
          history.push({ points: pts, label, type, refId, date: todayStr(), ts: Date.now() })
          transaction.set(ref, { history }, { merge: true })
        })
      },

      // Undo of an award: remove the most recent matching history entry.
      async revokePoints(kidName, type, refId) {
        if (!kidName) return
        const ref = doc(db, 'kidPoints', kidName)
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          if (!snap.exists()) return
          const history = [...(snap.data().history || [])]
          let removeIdx = -1
          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i]?.type === type && history[i]?.refId === refId) {
              removeIdx = i
              break
            }
          }
          if (removeIdx < 0) return
          history.splice(removeIdx, 1)
          transaction.set(ref, { history }, { merge: true })
        })
      },

      // `expected` is the entry the parent was looking at; it guards against
      // removing a different row that shifted while the modal was open.
      async deleteHistoryEntry(kidName, index, expected) {
        const ref = doc(db, 'kidPoints', kidName)
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          if (!snap.exists()) return
          const history = [...(snap.data().history || [])]
          const at = findEntry(history, index, expected)
          if (at < 0) throw new Error('That entry has already changed. Refresh and try again.')
          history.splice(at, 1)
          transaction.set(ref, { history }, { merge: true })
        })
      },

      // Wipes earned + redeemed history for the given kids.
      async resetKids(kidNames) {
        await Promise.all(
          kidNames.map((n) =>
            setDoc(doc(db, 'kidPoints', n), { history: [], redeemed: [], pendingRedemptions: [] }),
          ),
        )
      },

      // Two parents approving from two devices can't double-apply: the
      // transaction re-reads the queue and only the first commit wins.
      async approveRedemption(kidName, index, expected) {
        const ref = doc(db, 'kidPoints', kidName)
        return runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          if (!snap.exists()) return null
          const data = snap.data()
          const pending = [...(data.pendingRedemptions || [])]
          const at = findEntry(pending, index, expected)
          if (at < 0) return null
          const item = pending.splice(at, 1)[0]
          const redeemed = [...(data.redeemed || []), { ...item, date: todayStr(), approvedAt: Date.now() }]
          transaction.set(ref, { pendingRedemptions: pending, redeemed }, { merge: true })
          return item
        })
      },

      async denyRedemption(kidName, index, expected) {
        const ref = doc(db, 'kidPoints', kidName)
        return runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          if (!snap.exists()) return null
          const pending = [...(snap.data().pendingRedemptions || [])]
          const at = findEntry(pending, index, expected)
          if (at < 0) return null
          const item = pending.splice(at, 1)[0]
          transaction.set(ref, { pendingRedemptions: pending }, { merge: true })
          return item
        })
      },
    }),
    [kidPoints],
  )

  return <KidPointsContext.Provider value={value}>{children}</KidPointsContext.Provider>
}

export function useKidPoints() {
  return useContext(KidPointsContext)
}
