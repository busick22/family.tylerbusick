// "Whose turn" rotations — movie night picker and dog-feeding duty.
// settings/movieTurn and settings/dogFeedTurn, each { currentIndex, order,
// updatedAt, updatedBy }.

import { createContext, useContext, useMemo } from 'react'
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useDocument } from './useCollection.js'
import { MOVIE_TURN_ORDER, DOG_FEED_TURN_ORDER, resolveTurnIndex } from '../lib/family.js'

const TurnsContext = createContext(null)

export function TurnsProvider({ children }) {
  const { user } = useAuth()
  const movie = useDocument(user, 'settings', 'movieTurn', 'the movie-night turn', (snap) =>
    resolveTurnIndex(snap.exists() ? snap.data() : null, MOVIE_TURN_ORDER),
  )
  const dog = useDocument(user, 'settings', 'dogFeedTurn', 'the dog-feeding turn', (snap) =>
    resolveTurnIndex(snap.exists() ? snap.data() : null, DOG_FEED_TURN_ORDER),
  )
  const movieTurnIndex = movie.data ?? 0
  const dogFeedTurnIndex = dog.data ?? 0
  const loading = movie.loading || dog.loading
  const error = movie.error || dog.error

  const value = useMemo(
    () => ({
      movieTurnIndex,
      dogFeedTurnIndex,
      loading,
      error,
      moviePicker: MOVIE_TURN_ORDER[movieTurnIndex] || MOVIE_TURN_ORDER[0],
      dogFeeder: DOG_FEED_TURN_ORDER[dogFeedTurnIndex] || DOG_FEED_TURN_ORDER[0],

      async advanceMovieTurn() {
        const ref = doc(db, 'settings', 'movieTurn')
        const who = user?.displayName?.split(' ')[0] || 'Family'
        return runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          const current = resolveTurnIndex(snap.exists() ? snap.data() : null, MOVIE_TURN_ORDER)
          const nextIndex = (current + 1) % MOVIE_TURN_ORDER.length
          transaction.set(
            ref,
            {
              currentIndex: nextIndex,
              order: MOVIE_TURN_ORDER,
              updatedAt: serverTimestamp(),
              updatedBy: who,
            },
            { merge: true },
          )
          return MOVIE_TURN_ORDER[nextIndex]
        })
      },

      async advanceDogTurn() {
        const ref = doc(db, 'settings', 'dogFeedTurn')
        const who = user?.displayName?.split(' ')[0] || 'Family'
        return runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          const current = resolveTurnIndex(snap.exists() ? snap.data() : null, DOG_FEED_TURN_ORDER)
          const nextIndex = (current + 1) % DOG_FEED_TURN_ORDER.length
          transaction.set(
            ref,
            {
              currentIndex: nextIndex,
              order: DOG_FEED_TURN_ORDER,
              updatedAt: serverTimestamp(),
              updatedBy: who,
            },
            { merge: true },
          )
          return DOG_FEED_TURN_ORDER[nextIndex]
        })
      },
    }),
    [movieTurnIndex, dogFeedTurnIndex, user, loading, error],
  )

  return <TurnsContext.Provider value={value}>{children}</TurnsContext.Provider>
}

export function useTurns() {
  return useContext(TurnsContext)
}
