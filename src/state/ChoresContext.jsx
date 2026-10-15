// The `chores` collection — recurring, day-of-week assigned duties.
// Shape: { name, assignee, day ('Sunday'...), points, done, completedAt,
// completedBy }.

import { createContext, useContext, useMemo } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { setWorkCompletion } from '../lib/workCompletion.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'
import { normalizeAssignment } from '../lib/family.js'

const ChoresContext = createContext(null)

export function ChoresProvider({ children }) {
  const { user } = useAuth()
  const {
    items: chores,
    loading,
    error,
  } = useCollection(user, 'chores', 'your weekly chores', {
    map: (d) => normalizeAssignment({ id: d.id, ...d.data() }),
  })

  const value = useMemo(
    () => ({
      chores,
      loading,
      error,

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
        const batch = writeBatch(db)
        chores.forEach((c) =>
          batch.update(doc(db, 'chores', c.id), { done: false, completedAt: null, completedBy: '' }),
        )
        await batch.commit()
      },
    }),
    [chores, user, loading, error],
  )

  return <ChoresContext.Provider value={value}>{children}</ChoresContext.Provider>
}

export function useChores() {
  return useContext(ChoresContext)
}
