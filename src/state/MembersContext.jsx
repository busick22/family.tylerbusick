// The family member list: settings/members → { list: string[] }.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { normalizeMemberList, normalizeMemberName, MEMBER_COLORS } from '../lib/family.js'

const MembersContext = createContext(null)

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

  const value = useMemo(
    () => ({
      members,

      memberColor(name) {
        const i = members.indexOf(normalizeMemberName(name))
        return MEMBER_COLORS[i >= 0 ? i % MEMBER_COLORS.length : 0] || '#888'
      },

      async addMember(name) {
        const canonical = normalizeMemberName(name)
        if (!canonical || members.includes(canonical)) return false
        await setDoc(doc(db, 'settings', 'members'), { list: [...members, canonical] })
        return true
      },

      async removeMember(index) {
        await setDoc(doc(db, 'settings', 'members'), {
          list: members.filter((_, i) => i !== index),
        })
      },
    }),
    [members],
  )

  return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>
}

export function useMembers() {
  return useContext(MembersContext)
}
