// The family member list: settings/members → { list: string[] }.

import { createContext, useContext, useMemo } from 'react'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './AuthContext.jsx'
import { useDocument } from './useCollection.js'
import { normalizeMemberList, normalizeMemberName, MEMBER_COLORS } from '../lib/family.js'

const MembersContext = createContext(null)

export function MembersProvider({ children }) {
  const { user } = useAuth()
  const {
    data: members,
    loading,
    error,
  } = useDocument(
    user,
    'settings',
    'members',
    'family members',
    (snap) => normalizeMemberList((snap.exists() && snap.data().list) || []),
    [],
  )

  const value = useMemo(
    () => ({
      members,
      loading,
      error,

      memberColor(name) {
        const i = members.indexOf(normalizeMemberName(name))
        return MEMBER_COLORS[i >= 0 ? i % MEMBER_COLORS.length : 0] || '#888'
      },

      async addMember(name) {
        const canonical = normalizeMemberName(name)
        if (!canonical) return false
        const ref = doc(db, 'settings', 'members')
        return runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          const current = normalizeMemberList((snap.exists() && snap.data().list) || [])
          if (current.includes(canonical)) return false
          transaction.set(ref, { list: [...current, canonical] })
          return true
        })
      },

      async removeMember(name) {
        const canonical = normalizeMemberName(name)
        const ref = doc(db, 'settings', 'members')
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref)
          const current = normalizeMemberList((snap.exists() && snap.data().list) || [])
          transaction.set(ref, { list: current.filter((member) => member !== canonical) })
        })
      },
    }),
    [members, loading, error],
  )

  return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>
}

export function useMembers() {
  return useContext(MembersContext)
}
