// Per-kid screen-time budgets/sessions (screenTime/{kidName}) and the kids'
// "more time please" requests (screenTimeRequests collection).

import { createContext, useContext, useMemo } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  runTransaction,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'
import { KIDS, todayStr } from '../lib/family.js'
import {
  defaultScreenTime,
  computeTimerView,
  DEFAULT_BUDGETS_MS,
  FALLBACK_DAILY_BUDGET_MS,
} from '../lib/screenTime.js'

const ScreenTimeContext = createContext(null)

function timeAdjustment(data, deltaMs) {
  const today = todayStr()
  const baseUsed = data.lastResetDate === today ? data.usedMsToday || 0 : 0
  const currentBonus = data.bonusDate === today ? data.bonusMsToday || 0 : 0
  if (deltaMs >= 0)
    return {
      lastResetDate: today,
      bonusDate: today,
      bonusMsToday: currentBonus + deltaMs,
      usedMsToday: baseUsed,
    }
  const takeMs = Math.abs(deltaMs)
  const bonusAfterTake = Math.max(0, currentBonus - takeMs)
  return {
    lastResetDate: today,
    bonusDate: today,
    bonusMsToday: bonusAfterTake,
    usedMsToday: baseUsed + Math.max(0, takeMs - currentBonus),
  }
}

export function ScreenTimeProvider({ children }) {
  const { user } = useAuth()
  // One listener on the whole collection rather than one per kid: the docs are
  // keyed by kid name, `getFor` already fills in a default for a kid with no
  // doc yet, and kidPoints reads the same way under the same rule.
  const time = useCollection(user, 'screenTime', 'screen time', { toMap: (d) => d.data() })
  const requestState = useCollection(user, 'screenTimeRequests', 'screen-time requests', {
    map: (d) => ({ id: d.id, ...d.data() }),
  })
  const screenTimeByKid = time.items
  const requests = useMemo(
    () => [...requestState.items].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)),
    [requestState.items],
  )
  const loading = time.loading || requestState.loading
  const error = time.error || requestState.error

  const value = useMemo(() => {
    function getFor(kidName) {
      return screenTimeByKid[kidName] || defaultScreenTime(kidName)
    }

    return {
      screenTimeByKid,
      loading,
      error,
      requests,
      getFor,

      viewFor(kidName) {
        return computeTimerView(getFor(kidName), kidName)
      },

      // Start/pause the kid's session. Returns 'started' | 'paused'.
      async toggleSession(kidName) {
        const ref = doc(db, 'screenTime', kidName)
        return runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref)
          const data = snapshot.exists() ? snapshot.data() : defaultScreenTime(kidName)
          const view = computeTimerView(data, kidName)
          const today = todayStr()
          if (view.running) {
            const elapsed = Date.now() - data.activeSessionStart
            const baseUsed = data.lastResetDate === today ? data.usedMsToday || 0 : 0
            transaction.set(
              ref,
              {
                usedMsToday: baseUsed + Math.max(0, elapsed),
                lastResetDate: today,
                activeSessionStart: null,
              },
              { merge: true },
            )
            return 'paused'
          }
          transaction.set(ref, { lastResetDate: today, activeSessionStart: Date.now() }, { merge: true })
          return 'started'
        })
      },

      // First render of a new day: zero out yesterday's usage. A session
      // still running across midnight is re-anchored to now, not killed.
      async ensureDailyReset(kidName) {
        const ref = doc(db, 'screenTime', kidName)
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref)
          const data = snapshot.exists() ? snapshot.data() : defaultScreenTime(kidName)
          const today = todayStr()
          if (data.lastResetDate === today) return
          transaction.set(
            ref,
            {
              usedMsToday: 0,
              lastResetDate: today,
              bonusMsToday: 0,
              bonusDate: today,
              activeSessionStart: data.activeSessionStart ? Date.now() : null,
            },
            { merge: true },
          )
        })
      },

      // Timer hit zero while running: bank the full budget and stop.
      async expireSession(kidName) {
        const ref = doc(db, 'screenTime', kidName)
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref)
          const data = snapshot.exists() ? snapshot.data() : defaultScreenTime(kidName)
          if (!data.activeSessionStart) return
          const view = computeTimerView(data, kidName)
          transaction.set(
            ref,
            {
              usedMsToday: view.budget || DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS,
              lastResetDate: todayStr(),
              activeSessionStart: null,
            },
            { merge: true },
          )
        })
      },

      // Positive delta = give same-day bonus time; negative = take time away.
      async adjustTime(kidName, deltaMs) {
        const ref = doc(db, 'screenTime', kidName)
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref)
          const data = snapshot.exists() ? snapshot.data() : defaultScreenTime(kidName)
          transaction.set(ref, timeAdjustment(data, deltaMs), { merge: true })
        })
      },

      // Granting a request and removing it are one operation. Retrying after a
      // network interruption cannot add the same bonus twice.
      async grantRequest(id) {
        const requestRef = doc(db, 'screenTimeRequests', id)
        return runTransaction(db, async (transaction) => {
          const requestSnapshot = await transaction.get(requestRef)
          if (!requestSnapshot.exists()) return null
          const request = requestSnapshot.data()
          const kidName = request.kidName
          const requestedMs = Number(request.requestedMs) || 0
          if (!KIDS.includes(kidName) || requestedMs <= 0) throw new Error('Invalid screen-time request.')
          const timeRef = doc(db, 'screenTime', kidName)
          const timeSnapshot = await transaction.get(timeRef)
          const data = timeSnapshot.exists() ? timeSnapshot.data() : defaultScreenTime(kidName)
          transaction.set(timeRef, timeAdjustment(data, requestedMs), { merge: true })
          transaction.delete(requestRef)
          return { kidName, requestedMs }
        })
      },

      async resetToday(kidName) {
        await setDoc(
          doc(db, 'screenTime', kidName),
          {
            usedMsToday: 0,
            lastResetDate: todayStr(),
            bonusMsToday: 0,
            bonusDate: todayStr(),
            activeSessionStart: null,
          },
          { merge: true },
        )
      },

      async setBudget(kidName, minutes) {
        const ref = doc(db, 'screenTime', kidName)
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref)
          const data = snapshot.exists() ? snapshot.data() : {}
          transaction.set(
            ref,
            {
              dailyBudgetMs: minutes * 60000,
              lastResetDate: data.lastResetDate || todayStr(),
            },
            { merge: true },
          )
        })
      },

      async addRequest(kidName, requestedMs) {
        await addDoc(collection(db, 'screenTimeRequests'), {
          kidName,
          requestedMs,
          createdAt: serverTimestamp(),
        })
      },

      async deleteRequest(id) {
        await deleteDoc(doc(db, 'screenTimeRequests', id))
      },
    }
  }, [screenTimeByKid, requests, loading, error])

  return <ScreenTimeContext.Provider value={value}>{children}</ScreenTimeContext.Provider>
}

export function useScreenTime() {
  return useContext(ScreenTimeContext)
}
