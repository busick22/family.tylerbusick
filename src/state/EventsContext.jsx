// The `events` collection — the family calendar. Shape: { title, date
// ('YYYY-MM-DD'), time ('HH:MM'|null), location, notes, color, who[],
// gcalEventId (set when synced to Google Calendar), createdAt }.

import { createContext, useContext, useMemo } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useCollection } from './useCollection.js'
import { normalizeMemberList } from '../lib/family.js'

const EventsContext = createContext(null)

export function EventsProvider({ children }) {
  const { user } = useAuth()
  const {
    items: events,
    loading,
    error,
  } = useCollection(user, 'events', 'your calendar', {
    map: (d) => {
      const data = { id: d.id, ...d.data() }
      return { ...data, who: normalizeMemberList(data.who) }
    },
  })

  const value = useMemo(
    () => ({
      events,
      loading,
      error,

      async addEvent(data) {
        const ref = await addDoc(collection(db, 'events'), {
          ...data,
          createdAt: serverTimestamp(),
        })
        return ref.id
      },

      async updateEvent(id, data) {
        await updateDoc(doc(db, 'events', id), data)
      },

      async deleteEvent(id) {
        await deleteDoc(doc(db, 'events', id))
      },
    }),
    [events, loading, error],
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents() {
  return useContext(EventsContext)
}
