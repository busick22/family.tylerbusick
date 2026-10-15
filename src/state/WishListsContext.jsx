import { createContext, useContext, useMemo } from 'react'
import {
  addDoc,
  collection,
  doc,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection, useLiveData } from './useCollection.js'
import { KIDS } from '../lib/family.js'
import { wishFields, wishListName } from '../lib/wishLists.js'

const WishListsContext = createContext(null)

// Mounted only on the signed-in Kids page. No family collection listeners
// are needed to view a public link.
export function WishListsProvider({ children }) {
  const { user } = useAuth()
  const {
    items: lists,
    loading,
    error,
  } = useCollection(user, 'wishLists', 'wish lists', {
    makeRef: () => query(collection(db, 'wishLists'), where('archived', '==', false)),
    map: (entry) => ({ ...entry.data(), id: entry.id }),
    sort: (a, b) => a.name.localeCompare(b.name),
  })

  const value = useMemo(
    () => ({
      lists,
      loading,
      error,
      async createList(kid, name) {
        if (!KIDS.includes(kid)) throw new Error('Choose a kid first.')
        const ref = await addDoc(collection(db, 'wishLists'), {
          kid,
          name: wishListName(name),
          shared: false,
          archived: false,
          createdAt: serverTimestamp(),
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
    }),
    [lists, loading, error],
  )

  return <WishListsContext.Provider value={value}>{children}</WishListsContext.Provider>
}

export function useWishLists() {
  return useContext(WishListsContext)
}

// Also used by the public share page, which has no signed-in user — the list
// id alone decides whether there is anything to listen to.
export function useWishItems(listId) {
  const { data, loading, error } = useLiveData({
    enabled: Boolean(listId),
    makeRef: () => collection(db, 'wishLists', listId, 'items'),
    read: (snapshot) =>
      snapshot.docs
        .map((entry) => ({ ...entry.data(), id: entry.id }))
        .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)),
    label: 'these wishes',
    empty: [],
    deps: [listId],
  })
  return { items: data || [], loading, error }
}
