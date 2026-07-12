// Who is signed into the app. The whole family shares one Google account on
// the kitchen tablet today (see firestore.rules) — so unlike the sibling
// apps, sign-in is Google-only, no email/password.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase.js'

const AuthContext = createContext(null)

const FRIENDLY_ERRORS = {
  'auth/popup-closed-by-user': 'The Google window closed before finishing.',
  'auth/popup-blocked':
    'The Google window was blocked. Allow popups for this site, then try again.',
  'auth/operation-not-allowed':
    'Google sign-in isn’t enabled yet (Firebase Console → Authentication → Sign-in method).',
}

function friendlyAuthError(err) {
  return FRIENDLY_ERRORS[err?.code] || err?.message || 'Sign-in failed.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setInitializing(false)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      initializing,

      async signInWithGoogle() {
        try {
          await signInWithPopup(auth, new GoogleAuthProvider())
        } catch (err) {
          if (err?.code === 'auth/popup-closed-by-user') return
          // Popup blocked (embedded browsers, strict blockers): send the whole
          // page to Google instead — we land back here signed in.
          if (err?.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, new GoogleAuthProvider())
            return
          }
          throw new Error(friendlyAuthError(err))
        }
      },

      signOut() {
        return firebaseSignOut(auth)
      },
    }),
    [user, initializing],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
