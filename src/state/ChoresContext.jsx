// The `chores` collection — recurring, day-of-week assigned duties.
// Shape: { name, assignee, day ('Sunday'...), points, done, completedAt,
// completedBy }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeAssignment } from '../lib/family.js'

const ChoresContext = createContext(null)

export function ChoresProvider({ children }) {
  const { user } = useAuth()
  const [chores, setChores] = useState([])

  useEffect(() => {
    if (!user) {
      setChores([])
      return undefined
    }
    return onSnapshot(
      collection(db, 'chores'),
      (snap) => setChores(snap.docs.map((d) => normalizeAssignment({ id: d.id, ...d.data() }))),
      (err) => console.error('Chores listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      chores,

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

      async toggleChore(id, done) {
        const who = done ? user?.displayName?.split(' ')[0] || '' : ''
        await updateDoc(doc(db, 'chores', id), {
          done,
          completedAt: done ? serverTimestamp() : null,
          completedBy: who,
        })
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
    [chores, user],
  )

  return <ChoresContext.Provider value={value}>{children}</ChoresContext.Provider>
}

export function useChores() {
  return useContext(ChoresContext)
}
