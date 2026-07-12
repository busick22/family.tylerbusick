// The family member list: settings/members → { list: string[] }.

import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeMemberList } from '../lib/family.js'

const MembersContext = createContext([])

export function MembersProvider({ children }) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (!user) {
      setMembers([])
      return undefined
    }
    return onSnapshot(
      doc(db, 'settings', 'members'),
      (snap) => setMembers(normalizeMemberList((snap.exists() && snap.data().list) || [])),
      (err) => console.error('Members listener failed:', err),
    )
  }, [user])

  return <MembersContext.Provider value={members}>{children}</MembersContext.Provider>
}

export function useMembers() {
  return useContext(MembersContext)
}
