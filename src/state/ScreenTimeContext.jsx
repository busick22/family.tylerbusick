// Per-kid screen-time budgets/sessions (screenTime/{kidName}) and the kids'
// "more time please" requests (screenTimeRequests collection).

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { KIDS, todayStr } from '../lib/family.js'
import { defaultScreenTime, computeTimerView, DEFAULT_BUDGETS_MS, FALLBACK_DAILY_BUDGET_MS } from '../lib/screenTime.js'

const ScreenTimeContext = createContext(null)

export function ScreenTimeProvider({ children }) {
  const { user } = useAuth()
  const [screenTimeByKid, setScreenTimeByKid] = useState({})
  const [requests, setRequests] = useState([])

  useEffect(() => {
    if (!user) {
      setScreenTimeByKid({})
      setRequests([])
      return undefined
    }
    const unsubs = KIDS.map((name) =>
      onSnapshot(
        doc(db, 'screenTime', name),
        (snap) =>
          setScreenTimeByKid((prev) => ({
            ...prev,
            [name]: snap.exists() ? snap.data() : defaultScreenTime(name),
          })),
        (err) => console.error('Screen time listener failed:', name, err),
      ),
    )
    unsubs.push(
      onSnapshot(
        collection(db, 'screenTimeRequests'),
        (snap) =>
          setRequests(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)),
          ),
        (err) => console.error('Screen time requests listener failed:', err),
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [user])

  const value = useMemo(() => {
    function getFor(kidName) {
      return screenTimeByKid[kidName] || defaultScreenTime(kidName)
    }

    return {
      screenTimeByKid,
      requests,
      getFor,

      viewFor(kidName) {
        return computeTimerView(getFor(kidName), kidName)
      },

      // Start/pause the kid's session. Returns 'started' | 'paused'.
      async toggleSession(kidName) {
        const data = getFor(kidName)
        const view = computeTimerView(data, kidName)
        const today = todayStr()
        if (view.running) {
          const elapsed = Date.now() - data.activeSessionStart
          const baseUsed = data.lastResetDate === today ? data.usedMsToday || 0 : 0
          await setDoc(
            doc(db, 'screenTime', kidName),
            { ...data, usedMsToday: baseUsed + Math.max(0, elapsed), lastResetDate: today, activeSessionStart: null },
            { merge: true },
          )
          return 'paused'
        }
        await setDoc(
          doc(db, 'screenTime', kidName),
          { ...data, lastResetDate: today, activeSessionStart: Date.now() },
          { merge: true },
        )
        return 'started'
      },

      // First render of a new day: zero out yesterday's usage. A session
      // still running across midnight is re-anchored to now, not killed.
      async ensureDailyReset(kidName) {
        const data = getFor(kidName)
        if (data.lastResetDate === todayStr()) return
        await setDoc(
          doc(db, 'screenTime', kidName),
          {
            ...data,
            usedMsToday: 0,
            lastResetDate: todayStr(),
            bonusMsToday: 0,
            bonusDate: todayStr(),
            activeSessionStart: data.activeSessionStart ? Date.now() : null,
          },
          { merge: true },
        )
      },

      // Timer hit zero while running: bank the full budget and stop.
      async expireSession(kidName) {
        const data = getFor(kidName)
        if (!data.activeSessionStart) return
        const view = computeTimerView(data, kidName)
        await setDoc(
          doc(db, 'screenTime', kidName),
          {
            ...data,
            usedMsToday: view.budget || DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS,
            lastResetDate: todayStr(),
            activeSessionStart: null,
          },
          { merge: true },
        )
      },

      // Positive delta = give same-day bonus time; negative = take time away.
      async adjustTime(kidName, deltaMs) {
        const data = getFor(kidName)
        const today = todayStr()
        const baseUsed = data.lastResetDate === today ? data.usedMsToday || 0 : 0
        const currentBonus = data.bonusDate === today ? data.bonusMsToday || 0 : 0
        const updates = { ...data, lastResetDate: today, bonusDate: today }
        if (deltaMs >= 0) {
          updates.bonusMsToday = currentBonus + deltaMs
          updates.usedMsToday = baseUsed
        } else {
          const takeMs = Math.abs(deltaMs)
          const bonusAfterTake = Math.max(0, currentBonus - takeMs)
          const usedPenalty = Math.max(0, takeMs - currentBonus)
          updates.bonusMsToday = bonusAfterTake
          updates.usedMsToday = baseUsed + usedPenalty
        }
        await setDoc(
          doc(db, 'screenTime', kidName),
          updates,
          { merge: true },
        )
      },

      async resetToday(kidName) {
        const data = getFor(kidName)
        await setDoc(
          doc(db, 'screenTime', kidName),
          {
            ...data,
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
        const data = getFor(kidName)
        await setDoc(
          doc(db, 'screenTime', kidName),
          { ...data, dailyBudgetMs: minutes * 60000, lastResetDate: data.lastResetDate || todayStr() },
          { merge: true },
        )
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
  }, [screenTimeByKid, requests])

  return <ScreenTimeContext.Provider value={value}>{children}</ScreenTimeContext.Provider>
}

export function useScreenTime() {
  return useContext(ScreenTimeContext)
}
