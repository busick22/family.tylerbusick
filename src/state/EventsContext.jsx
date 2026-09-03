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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    if (!user) {
      setEvents([])
      setLoading(false)
      return undefined
    }
    return onSnapshot(
      collection(db, 'events'),
      (snap) => {
        setEvents(
          snap.docs.map((d) => {
            const data = { id: d.id, ...d.data() }
            return { ...data, who: normalizeMemberList(data.who) }
          }),
        ); setLoading(false)
      },
      (err) => { console.error('calendar listener failed:', err); setLoading(false); setError('Could not load your calendar. Check your connection or sign in again.') },
    )
  }, [user])

  const value = useMemo(
    () => ({
      events, loading, error,

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
