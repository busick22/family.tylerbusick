// Assignee dropdown: Anyone / each family member / "Any Kid" (the shared
// kid-stack value). `filterMode` swaps the empty label for filter bars.

import { useMembers } from '../../state/MembersContext.jsx'
import { ANY_KID_ASSIGNEE } from '../../lib/family.js'

export default function AssigneeSelect({ value, onChange, filterMode = false, id, ariaLabel }) {
  const { members } = useMembers()
  return (
    <select
      id={id}
      className="field select-field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      <option value="">{filterMode ? 'All people' : 'Anyone'}</option>
      {members.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
      <option value={ANY_KID_ASSIGNEE}>👦 Any Kid</option>
    </select>
  )
}
