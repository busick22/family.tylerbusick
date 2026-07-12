// Installs window.onerror + unhandledrejection handlers that write a single
// doc to the `errors` Firestore collection, so problems on the kitchen
// tablet show up somewhere a parent can see them. Throttled so a runaway
// error loop can't burn quota. Straight port of the old
// public/shared-utils.js installErrorReporter.

import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

let installed = false
const recent = new Map() // hash → ts
const THROTTLE_MS = 60_000

function hashErr(msg, src, line) {
  return `${msg}|${src}|${line}`
}

export function installErrorReporter() {
  if (installed) return
  installed = true

  async function report(payload) {
    try {
      const key = hashErr(payload.message, payload.source, payload.lineno)
      const now = Date.now()
      const last = recent.get(key)
      if (last && now - last < THROTTLE_MS) return
      recent.set(key, now)
      await addDoc(collection(db, 'errors'), {
        ...payload,
        ts: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: location.href,
      })
    } catch {
      // never let error reporting crash the page
    }
  }

  window.addEventListener('error', (e) => {
    report({
      kind: 'error',
      message: String(e.message || 'Unknown error'),
      source: String(e.filename || ''),
      lineno: e.lineno || 0,
      colno: e.colno || 0,
      stack: e.error?.stack ? String(e.error.stack).slice(0, 2000) : '',
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    report({
      kind: 'promise',
      message: String(r?.message || r || 'Unhandled rejection'),
      source: '',
      lineno: 0,
      colno: 0,
      stack: r?.stack ? String(r.stack).slice(0, 2000) : '',
    })
  })
}
