import { useState } from 'react'
import { Link } from 'react-router-dom'
import CalendarTab from '../planner/CalendarTab.jsx'
import EventModal from '../planner/EventModal.jsx'
import Notice, { useNotice } from '../../components/Notice.jsx'
import { useEvents } from '../../state/EventsContext.jsx'
import '../planner/planner.css'
import '../meals/meals.css'

export default function CalendarPage() {
  const [event, setEvent] = useState(undefined)
  const [notice, showNotice] = useNotice()
  const { loading, error } = useEvents()
  return <div className="page page-enter">
    <Notice notice={notice} />
    <header className="workspace-title"><div><p className="workspace-eyebrow">Appointments & activities</p><h1>Calendar</h1></div><Link className="btn" to="/">Week view</Link></header>
    {error && <p className="workspace-status" role="alert">{error}</p>}
    {loading && <p className="workspace-status" role="status">Loading your calendar…</p>}
    <CalendarTab onAddEvent={date => setEvent(date ? { date } : null)} onEditEvent={setEvent} />
    {event !== undefined && <EventModal event={event} onClose={() => setEvent(undefined)} showNotice={showNotice} />}
  </div>
}
