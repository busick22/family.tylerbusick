// The `todos` collection — one-off tasks (as opposed to recurring `chores`).

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeAssignment } from '../lib/family.js'

const TodosContext = createContext([])

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

  return <TodosContext.Provider value={todos}>{children}</TodosContext.Provider>
}

export function useTodos() {
  return useContext(TodosContext)
}
