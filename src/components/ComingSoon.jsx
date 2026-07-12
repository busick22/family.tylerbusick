// Placeholder body for areas not yet ported from the old static site. Each
// page keeps its real header so navigation/theming stay testable now.

import { Hammer } from 'lucide-react'

export default function ComingSoon({ children }) {
  return (
    <div className="card empty-state" style={{ maxWidth: 520 }}>
      <Hammer aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}
