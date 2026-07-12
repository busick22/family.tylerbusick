// Calendar tab: the embedded family Google Calendar (month on desktop,
// week on phones) plus a shortcut to add an event to the Today view.

import { Plus } from 'lucide-react'
import { GCAL_EMBED_SRC, GCAL_EMBED_SRC_WEEK } from '../../lib/gcal.js'

export default function CalendarTab({ onAddEvent }) {
  return (
    <div className="calendar-tab">
      <div className="calendar-tab-head">
        <p className="calendar-tab-copy">
          Your embedded family Google Calendar. Add events here to track them on the Today tab too.
        </p>
        <button className="btn btn-sm" onClick={onAddEvent}>
          <Plus aria-hidden="true" size={15} /> Add to Today view
        </button>
      </div>
      <div className="card cal-iframe-wrap cal-desktop-only">
        <iframe src={GCAL_EMBED_SRC} title="Busick Family Calendar" />
      </div>
      <div className="card cal-iframe-wrap cal-mobile-only">
        <iframe src={GCAL_EMBED_SRC_WEEK} title="Busick Family Calendar Weekly" />
      </div>
    </div>
  )
}
