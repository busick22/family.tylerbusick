// Shared Firestore listener hooks.
//
// Every context used to hand-roll the same useEffect: bail out when signed
// out, open an onSnapshot, map the docs, log on failure. There were fourteen
// copies, and they had drifted — five reported `loading` and `error` to the
// UI while the rest only wrote to the console, so a failure in one of those
// looked exactly like an empty list.
//
// These hooks are the one implementation. They all return the same
// { loading, error } pair, so a page can trust every context it reads.
// `error` is always a string; '' means no error.

import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'

const EMPTY_LIST = []
const EMPTY_MAP = {}

/**
 * The core listener. `enabled` gates it (normally the signed-in user, but the
 * public wish-list page listens while signed out). `makeRef` builds the query
 * or reference, `read` turns a snapshot into the value the caller wants, and
 * `label` names the data in the "could not load X" message. `deps` lists the
 * values that decide *which* listener to open — `makeRef` and `read` are
 * recreated every render by design and are deliberately not dependencies.
 */
export function useLiveData({ enabled, makeRef, read, label, empty = null, deps = [] }) {
  const [state, setState] = useState({ data: empty, loading: true, error: '' })

  useEffect(() => {
    if (!enabled) {
      setState({ data: empty, loading: false, error: '' })
      return undefined
    }
    setState((previous) => ({ ...previous, loading: true, error: '' }))
    return onSnapshot(
      makeRef(),
      (snapshot) => setState({ data: read(snapshot), loading: false, error: '' }),
      (err) => {
        console.error(`${label} listener failed:`, err)
        setState({
          data: empty,
          loading: false,
          error: `Could not load ${label}. Check your connection or sign in again.`,
        })
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(enabled), label, ...deps])

  return state
}

/**
 * Listen to a whole collection.
 * `map` turns one document into an item; the default keeps `{ id, ...data }`.
 * `toMap` instead returns an object keyed by document id.
 * `makeRef` overrides the reference entirely (for a filtered query).
 */
export function useCollection(user, path, label, { map, toMap, makeRef, sort } = {}) {
  const { data, loading, error } = useLiveData({
    enabled: user,
    makeRef: makeRef || (() => collection(db, path)),
    read: (snapshot) => {
      if (toMap) {
        const next = {}
        snapshot.docs.forEach((d) => {
          next[d.id] = toMap(d)
        })
        return next
      }
      const items = snapshot.docs.map((d) => (map ? map(d) : { id: d.id, ...d.data() }))
      return sort ? items.sort(sort) : items
    },
    label,
    empty: toMap ? EMPTY_MAP : EMPTY_LIST,
    deps: [path],
  })
  return useMemo(() => ({ items: data, loading, error }), [data, loading, error])
}

/**
 * Listen to a single document. `read` receives the snapshot — including a
 * non-existent one — so the caller decides what "not created yet" looks like.
 */
export function useDocument(user, path, id, label, read, empty = null) {
  const { data, loading, error } = useLiveData({
    enabled: user,
    makeRef: () => doc(db, path, id),
    read,
    label,
    empty,
    deps: [path, id],
  })
  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}
