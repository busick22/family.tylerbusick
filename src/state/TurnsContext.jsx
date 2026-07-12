// "Whose turn" rotations — movie night picker and dog-feeding duty.
// settings/movieTurn and settings/dogFeedTurn, each { currentIndex, order,
// updatedAt, updatedBy }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { MOVIE_TURN_ORDER, DOG_FEED_TURN_ORDER, resolveTurnIndex } from '../lib/family.js'

const TurnsContext = createContext(null)

export function TurnsProvider({ children }) {
  const { user } = useAuth()
  const [movieTurnIndex, setMovieTurnIndex] = useState(0)
  const [dogFeedTurnIndex, setDogFeedTurnIndex] = useState(0)

  useEffect(() => {
    if (!user) {
      setMovieTurnIndex(0)
      setDogFeedTurnIndex(0)
      return undefined
    }
    const unsubMovie = onSnapshot(
      doc(db, 'settings', 'movieTurn'),
      (snap) => setMovieTurnIndex(resolveTurnIndex(snap.exists() ? snap.data() : null, MOVIE_TURN_ORDER)),
      (err) => console.error('Movie turn listener failed:', err),
    )
    const unsubDog = onSnapshot(
      doc(db, 'settings', 'dogFeedTurn'),
      (snap) => setDogFeedTurnIndex(resolveTurnIndex(snap.exists() ? snap.data() : null, DOG_FEED_TURN_ORDER)),
      (err) => console.error('Dog-feed turn listener failed:', err),
    )
    return () => {
      unsubMovie()
      unsubDog()
    }
  }, [user])

  const value = useMemo(
    () => ({
      movieTurnIndex,
      dogFeedTurnIndex,
      moviePicker: MOVIE_TURN_ORDER[movieTurnIndex] || MOVIE_TURN_ORDER[0],
      dogFeeder: DOG_FEED_TURN_ORDER[dogFeedTurnIndex] || DOG_FEED_TURN_ORDER[0],

      async advanceMovieTurn() {
        const nextIndex = (movieTurnIndex + 1) % MOVIE_TURN_ORDER.length
        const who = user?.displayName?.split(' ')[0] || 'Family'
        await setDoc(
          doc(db, 'settings', 'movieTurn'),
          { currentIndex: nextIndex, order: MOVIE_TURN_ORDER, updatedAt: serverTimestamp(), updatedBy: who },
          { merge: true },
        )
        return MOVIE_TURN_ORDER[nextIndex]
      },

      async advanceDogTurn() {
        const nextIndex = (dogFeedTurnIndex + 1) % DOG_FEED_TURN_ORDER.length
        const who = user?.displayName?.split(' ')[0] || 'Family'
        await setDoc(
          doc(db, 'settings', 'dogFeedTurn'),
          { currentIndex: nextIndex, order: DOG_FEED_TURN_ORDER, updatedAt: serverTimestamp(), updatedBy: who },
          { merge: true },
        )
        return DOG_FEED_TURN_ORDER[nextIndex]
      },
    }),
    [movieTurnIndex, dogFeedTurnIndex, user],
  )

  return <TurnsContext.Provider value={value}>{children}</TurnsContext.Provider>
}

export function useTurns() {
  return useContext(TurnsContext)
}
