import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { KIDS } from '../lib/family.js'
import { wishFields, wishListName } from '../lib/wishLists.js'

const WishListsContext = createContext(null)

// Mounted only on the signed-in Kids page. No family collection listeners
// are needed to view a public link.
export function WishListsProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState({ lists: [], loading: true, error: null })

  useEffect(() => {
    if (!user) {
      setState({ lists: [], loading: false, error: null })
      return undefined
    }
    setState({ lists: [], loading: true, error: null })
    return onSnapshot(
      query(collection(db, 'wishLists'), where('archived', '==', false)),
      (snapshot) => setState({
        lists: snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        loading: false, error: null,
      }),
      () => setState({ lists: [], loading: false, error: 'Wish lists could not load. Check your connection and try again.' }),
    )
  }, [user])

  const value = useMemo(() => ({
    ...state,
    async createList(kid, name) {
      if (!KIDS.includes(kid)) throw new Error('Choose a kid first.')
      const ref = await addDoc(collection(db, 'wishLists'), {
        kid, name: wishListName(name), shared: false, archived: false, createdAt: serverTimestamp(),
      })
      return ref.id
    },
    renameList(id, name) {
      return updateDoc(doc(db, 'wishLists', id), { name: wishListName(name) })
    },
    setSharing(id, shared) {
      return updateDoc(doc(db, 'wishLists', id), { shared })
    },
    // A tombstone makes every existing link/child document inaccessible at
    // once, including during concurrent edits. No unbounded recursive delete.
    removeList(id) {
      return updateDoc(doc(db, 'wishLists', id), { archived: true, shared: false })
    },
    saveWish(listId, itemId, fields) {
      const data = wishFields(fields)
      const items = collection(db, 'wishLists', listId, 'items')
      return itemId
        ? updateDoc(doc(items, itemId), data)
        : addDoc(items, { ...data, createdAt: serverTimestamp() })
    },
    removeWish(listId, itemId) {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'wishLists', listId, 'items', itemId))
      batch.delete(doc(db, 'wishLists', listId, 'purchases', itemId))
      return batch.commit()
    },
  }), [state])

  return <WishListsContext.Provider value={value}>{children}</WishListsContext.Provider>
}

export function useWishLists() {
  return useContext(WishListsContext)
}

export function useWishItems(listId) {
  const [state, setState] = useState({ listId: null, items: [], loading: true, error: null })
  useEffect(() => {
    if (!listId) return undefined
    return onSnapshot(collection(db, 'wishLists', listId, 'items'), (snapshot) => {
      setState({ listId, items: snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))
        .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)), loading: false, error: null })
    }, () => setState({ listId, items: [], loading: false, error: 'These wishes could not load. Check your connection or reopen the list.' }))
  }, [listId])
  return state.listId === listId ? state : { items: [], loading: true, error: null }
}
