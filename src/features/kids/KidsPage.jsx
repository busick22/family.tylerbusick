// Kids — port of the old kids.html/js. A "who are you?" selector (plus a
// Parent tab with admin controls) leads into a per-kid dashboard with
// Today/Points/History/Wish Lists tabs. The active kid lives in the URL (?kid=Liam)
// so switching kids or refreshing the tablet remembers where you were,
// same as the old app.

import { useSearchParams } from 'react-router-dom'
import { KIDS } from '../../lib/family.js'
import KidSelector from './KidSelector.jsx'
import KidDashboard from './KidDashboard.jsx'
import { WishListsProvider } from '../../state/WishListsContext.jsx'
import './kids.css'

export default function KidsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const kidParam = searchParams.get('kid')
  const activeKid = KIDS.includes(kidParam) ? kidParam : null

  function selectKid(name) {
    setSearchParams(KIDS.includes(name) ? { kid: name } : {})
  }

  if (activeKid) {
    return <WishListsProvider><KidDashboard key={activeKid} kid={activeKid} onSwitchKid={() => selectKid(null)} /></WishListsProvider>
  }
  return <KidSelector onSelectKid={selectKid} />
}
