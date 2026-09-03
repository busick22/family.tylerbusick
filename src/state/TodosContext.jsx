// The `todos` collection — one-off tasks (as opposed to recurring `chores`).
// Shape: { text, listId, assignee, dueDate ('YYYY-MM-DD'|null), points,
// done, completedAt, completedBy, createdAt }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { setWorkCompletion } from '../lib/workCompletion.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeAssignment } from '../lib/family.js'

const TodosContext = createContext(null)

export function TodosProvider({ children }) {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    if (!user) {
      setTodos([])
      setLoading(false)
      return undefined
    }
    return onSnapshot(
      collection(db, 'todos'),
      (snap) => { setTodos(snap.docs.map((d) => normalizeAssignment({ id: d.id, ...d.data() }))); setLoading(false) },
      (err) => { console.error('to-dos listener failed:', err); setLoading(false); setError('Could not load your to-dos. Check your connection or sign in again.') },
    )
  }, [user])

  const value = useMemo(
    () => ({
      todos, loading, error,

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
