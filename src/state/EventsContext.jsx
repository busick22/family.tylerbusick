// The `events` collection — the family calendar. Shape: { title, date
// ('YYYY-MM-DD'), time ('HH:MM'|null), location, notes, color, who[],
// gcalEventId (set when synced to Google Calendar), createdAt }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeMemberList } from '../lib/family.js'

const EventsContext = createContext(null)

export function EventsProvider({ children }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!user) {
      setEvents([])
      return undefined
    }
    return onSnapshot(
      collection(db, 'events'),
      (snap) =>
        setEvents(
          snap.docs.map((d) => {
            const data = { id: d.id, ...d.data() }
            return { ...data, who: normalizeMemberList(data.who) }
          }),
        ),
      (err) => console.error('Events listener failed:', err),
    )
  }, [user])

  const value = useMemo(
    () => ({
      events,

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
    [events],
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents() {
  return useContext(EventsContext)
}
