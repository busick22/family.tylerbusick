// The `todos` collection — one-off tasks (as opposed to recurring `chores`).
// Shape: { text, listId, assignee, dueDate ('YYYY-MM-DD'|null), points,
// done, completedAt, completedBy, createdAt }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeAssignment } from '../lib/family.js'

const TodosContext = createContext(null)

export function TodosProvider({ children }) {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])

  useEffect(() => {
    if (!user) {
      setTodos([])
      return undefined
    }
    return onSnapshot(
      collection(db, 'todos'),
      (snap) => setTodos(snap.docs.map((d) => normalizeAssignment({ id: d.id, ...d.data() }))),
      (err) => console.error('Todos listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      todos,

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

      async toggleTodo(id, done) {
        const who = done ? user?.displayName?.split(' ')[0] || '' : ''
        await updateDoc(doc(db, 'todos', id), {
          done,
          completedAt: done ? serverTimestamp() : null,
          completedBy: who,
        })
      },

      async deleteTodo(id) {
        await deleteDoc(doc(db, 'todos', id))
      },
    }),
    [todos, user],
  )

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>
}

export function useTodos() {
  return useContext(TodosContext)
}
