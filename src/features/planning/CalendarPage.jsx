import { useState } from 'react'
import PlanNav from './PlanNav.jsx'
import CalendarTab from './CalendarTab.jsx'
import EventModal from './EventModal.jsx'
import { useEvents } from '../../state/EventsContext.jsx'
import './calendar.css'
import './planning.css'

export default function CalendarPage() {
  const [event, setEvent] = useState(undefined)
  const { loading, error } = useEvents()
  return (
    <div className="page page-enter">
      <header className="workspace-title">
        <h1>Plan</h1>
      </header>
      <PlanNav />
      {error && (
        <p className="workspace-status" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="workspace-status" role="status">
          Loading your calendar…
        </p>
      )}
      <CalendarTab onAddEvent={(date) => setEvent(date ? { date } : null)} onEditEvent={setEvent} />
      {event !== undefined && <EventModal event={event} onClose={() => setEvent(undefined)} />}
    </div>
  )
}
