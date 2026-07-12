// The `events` collection — the family calendar.

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'

const EventsContext = createContext([])

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
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Events listener failed:', err),
    )
  }, [user])

  return <EventsContext.Provider value={events}>{children}</EventsContext.Provider>
}

export function useEvents() {
  return useContext(EventsContext)
}
