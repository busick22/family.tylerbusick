// The `todoLists` collection — user-defined task lists ("General" always
// exists as a virtual default). Shape: { name, order }.

import { createContext, useContext, useMemo } from 'react'
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'

const TodoListsContext = createContext(null)

export const DEFAULT_TODO_LIST_ID = 'general'

export function normalizedTodoListId(v) {
  const id = String(v || '').trim()
  return id || DEFAULT_TODO_LIST_ID
}

function todoListIdFromName(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || `list-${Date.now()}`
  )
}

export function TodoListsProvider({ children }) {
  const { user } = useAuth()
  const { items: rawLists, loading, error } = useCollection(user, 'todoLists', 'your lists')

  const value = useMemo(() => {
    // "General" always exists even if no doc backs it yet.
    const lists = rawLists.map((l) => ({ ...l, id: normalizedTodoListId(l.id) }))
    if (!lists.some((l) => l.id === DEFAULT_TODO_LIST_ID)) {
      lists.unshift({ id: DEFAULT_TODO_LIST_ID, name: 'General', order: 0 })
    }
    lists.sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 9999
      const bo = Number.isFinite(b.order) ? b.order : 9999
      if (ao !== bo) return ao - bo
      return String(a.name || '').localeCompare(String(b.name || ''))
    })

    return {
      lists,
      loading,
      error,

      listName(id) {
        return lists.find((l) => l.id === normalizedTodoListId(id))?.name || 'General'
      },

      // Returns an error string, or null on success.
      async createList(name) {
        if (lists.some((l) => String(l.name || '').toLowerCase() === name.toLowerCase())) {
          return 'That list name already exists.'
        }
        let id = todoListIdFromName(name)
        let n = 2
        while (lists.some((l) => l.id === id)) id = `${todoListIdFromName(name)}-${n++}`
        const order = Math.max(0, ...lists.map((l) => (Number.isFinite(l.order) ? l.order : 0))) + 1
        await setDoc(doc(db, 'todoLists', id), { name, order, createdAt: serverTimestamp() }, { merge: true })
        return null
      },

      // Deletes a list; the caller is responsible for re-homing its tasks
      // (PlannerPage moves them to General first).
      async deleteList(id, impactedTodoIds) {
        const batch = writeBatch(db)
        impactedTodoIds.forEach((todoId) =>
          batch.update(doc(db, 'todos', todoId), { listId: DEFAULT_TODO_LIST_ID }),
        )
        batch.delete(doc(db, 'todoLists', normalizedTodoListId(id)))
        await batch.commit()
      },

      async reorder(orderedIds) {
        const metaById = new Map(lists.map((l) => [l.id, l]))
        const batch = writeBatch(db)
        orderedIds.forEach((id, index) => {
          const list = metaById.get(id) || { id, name: id === DEFAULT_TODO_LIST_ID ? 'General' : id }
          batch.set(
            doc(db, 'todoLists', id),
            {
              name: list.name || (id === DEFAULT_TODO_LIST_ID ? 'General' : 'Untitled'),
              order: index,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          )
        })
        await batch.commit()
      },
    }
  }, [rawLists, loading, error])

  return <TodoListsContext.Provider value={value}>{children}</TodoListsContext.Provider>
}

export function useTodoLists() {
  return useContext(TodoListsContext)
}
