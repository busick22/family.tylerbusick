// One place that knows about Firebase. Everything else imports from here.
//
// This is the same `busick-recipes` project the old static site used — the
// config below is copied over unchanged so all existing Firestore data
// keeps working. It's safe to keep in source; access is controlled by
// Firestore rules and Auth, not by hiding these strings.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAiWuSwOKkY69wWUklD8m86MKB-AOs5LzM',
  authDomain: 'busick-recipes.firebaseapp.com',
  projectId: 'busick-recipes',
  storageBucket: 'busick-recipes.firebasestorage.app',
  messagingSenderId: '960392900060',
  appId: '1:960392900060:web:3b8df6796af0bdba503319',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
