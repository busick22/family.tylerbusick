// The `chores` collection — recurring, day-of-week assigned duties.
// Shape: { name, assignee, day ('Sunday'...), points, done, completedAt,
// completedBy }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { setWorkCompletion } from '../lib/workCompletion.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeAssignment } from '../lib/family.js'

const ChoresContext = createContext(null)

export function ChoresProvider({ children }) {
  const { user } = useAuth()
  const [chores, setChores] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    if (!user) {
      setChores([])
      setLoading(false)
      return undefined
    }
    return onSnapshot(
      collection(db, 'chores'),
      (snap) => { setChores(snap.docs.map((d) => normalizeAssignment({ id: d.id, ...d.data() }))); setLoading(false) },
      (err) => { console.error('weekly chores listener failed:', err); setLoading(false); setError('Could not load your weekly chores. Check your connection or sign in again.') },
    )
  }, [user])

  const value = useMemo(
    () => ({
      chores, loading, error,

      async addChore(data) {
        await addDoc(collection(db, 'chores'), {
          ...data,
          done: false,
          completedAt: null,
          completedBy: '',
        })
      },

      async updateChore(id, data) {
        await updateDoc(doc(db, 'chores', id), data)
      },

      async toggleChore(id, done, actor = user?.displayName?.split(' ')[0] || '') {
        await setWorkCompletion(db, 'chore', id, done, actor)
      },

      async deleteChore(id) {
        await deleteDoc(doc(db, 'chores', id))
      },

      // Sunday-morning ritual: uncheck everything for a fresh week.
      async resetWeek() {
        await Promise.all(
          chores.map((c) =>
            updateDoc(doc(db, 'chores', c.id), { done: false, completedAt: null, completedBy: '' }),
          ),
        )
      },
    }),
    [chores, user, loading, error],
  )

  return <ChoresContext.Provider value={value}>{children}</ChoresContext.Provider>
}

export function useChores() {
  return useContext(ChoresContext)
}
