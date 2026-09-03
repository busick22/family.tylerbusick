// One place that knows about Firebase. Everything else imports from here.
//
// ⚠️ REPOINTED 2026-08-09 — this app now reads and writes `tyler-busick-22`,
// the dashboard's project, NOT `busick-recipes`.
//
// The family's data was copied across under the SAME top-level collection
// names (`todos`, `chores`, `events`, …), which is why this config swap was
// the only change needed — nothing else in this app knows the difference.
// Two views, one database: what the tablet ticks off, the dashboard sees, and
// the other way round.
//
// The app is still HOSTED at busick-recipes.web.app. That's fine — hosting and
// data don't have to share a project — but it does mean
// `busick-recipes.web.app` had to be added to tyler-busick-22's Authentication
// → Authorized domains, or sign-in from the tablet fails. It has been.
//
// `busick-recipes` still holds the old copy, untouched, as a fallback. Access
// is controlled by Firestore rules and Auth, not by hiding these strings.
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDil4uFa3UmvXuueHlIuLvLA8_WVgxkKPY',
  authDomain: 'tyler-busick-22.firebaseapp.com',
  projectId: 'tyler-busick-22',
  storageBucket: 'tyler-busick-22.firebasestorage.app',
  messagingSenderId: '638053943595',
  appId: '1:638053943595:web:b12ef84ec6bced097edd6e',
}

// Local verification only: demo IDs prevent tests from touching family data.
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true'
const app = initializeApp(useEmulators ? {
  apiKey: 'demo-family-wishes', projectId: 'demo-family-wishes', authDomain: 'localhost',
} : firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  connectFirestoreEmulator(db, '127.0.0.1', 8088)
}
