// The `todos` collection — one-off tasks (as opposed to recurring `chores`).
// Shape: { text, listId, assignee, dueDate ('YYYY-MM-DD'|null), points,
// done, completedAt, completedBy, createdAt }.

import { createContext, useContext, useMemo } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { setWorkCompletion } from '../lib/workCompletion.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'
import { normalizeAssignment } from '../lib/family.js'

const TodosContext = createContext(null)

export function TodosProvider({ children }) {
  const { user } = useAuth()
  const {
    items: todos,
    loading,
    error,
  } = useCollection(user, 'todos', 'your to-dos', {
    map: (d) => normalizeAssignment({ id: d.id, ...d.data() }),
  })

  const value = useMemo(
    () => ({
      todos,
      loading,
      error,

      async addTodo(data) {
        await addDoc(collection(db, 'todos'), {
          ...data,
          done: false,
          createdAt: serverTimestamp(),
        })
      },

      async updateTodo(id, data) {
        await updateDoc(doc(db, 'todos', id), { ...data, updatedAt: serverTimestamp() })
      },

      async toggleTodo(id, done, actor = user?.displayName?.split(' ')[0] || '') {
        await setWorkCompletion(db, 'task', id, done, actor)
      },

      async deleteTodo(id) {
        await deleteDoc(doc(db, 'todos', id))
      },
    }),
    [todos, user, loading, error],
  )

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>
}

export function useTodos() {
  return useContext(TodosContext)
}
