// Calendar tab: native month view for Family events. Events can still be
// pushed to Google Calendar from the event modal when the parent asks for it.

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useEvents } from '../../state/EventsContext.jsx'
import { DAYS, DAYS_SHORT, MONTHS, formatTime, todayStr } from '../../lib/family.js'

function dateKeyOf(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function longDayLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]}, ${MONTHS[m - 1]} ${d}`
}

export default function CalendarTab({ onAddEvent, onEditEvent }) {
  const { events } = useEvents()
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [expandedDay, setExpandedDay] = useState(null)

  function changeMonth(dir) {
    let m = calMonth + dir
    let y = calYear
    if (m > 11) { m = 0; y += 1 }
    if (m < 0) { m = 11; y -= 1 }
    setCalMonth(m)
    setCalYear(y)
  }

  function goToday() {
    const t = new Date()
    setCalYear(t.getFullYear())
    setCalMonth(t.getMonth())
  }

  const cells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const daysInPrev = new Date(calYear, calMonth, 0).getDate()
    const out = []
    for (let i = firstDay - 1; i >= 0; i -= 1) {
      out.push({
        day: daysInPrev - i,
        cur: false,
        year: calMonth === 0 ? calYear - 1 : calYear,
        month: calMonth === 0 ? 11 : calMonth - 1,
      })
    }
    for (let d = 1; d <= daysInMonth; d += 1) out.push({ day: d, cur: true, year: calYear, month: calMonth })
    const trailing = 42 - out.length
    for (let d = 1; d <= trailing; d += 1) {
      out.push({
        day: d,
        cur: false,
        year: calMonth === 11 ? calYear + 1 : calYear,
        month: calMonth === 11 ? 0 : calMonth + 1,
      })
    }
    return out
  }, [calMonth, calYear])

  const eventsByDate = useMemo(() => {
    const grouped = new Map()
    events.forEach((event) => {
      if (!event.date) return
      if (!grouped.has(event.date)) grouped.set(event.date, [])
      grouped.get(event.date).push(event)
    })
    grouped.forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        if (!a.time && !b.time) return (a.title || '').localeCompare(b.title || '')
        if (!a.time) return 1
        if (!b.time) return -1
        return a.time.localeCompare(b.time)
      })
    })
    return grouped
  }, [events])

  const today = todayStr()

  return (
    <div className="calendar-tab">
      <div className="calendar-tab-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button className="btn btn-sm" onClick={goToday}>Today</button>
          <button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <h2 className="cal-month-label">{MONTHS[calMonth]} {calYear}</h2>
        <button className="btn btn-sm" onClick={() => onAddEvent()}>
          <Plus aria-hidden="true" size={15} /> Event
        </button>
      </div>

      <div className="card planner-month">
        <div className="planner-month-weekdays">
          {DAYS_SHORT.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="planner-month-grid">
          {cells.map((cell, index) => {
            const dk = dateKeyOf(cell.year, cell.month, cell.day)
            const dayEvents = eventsByDate.get(dk) || []
            const visible = dayEvents.slice(0, 2)
            const overflow = dayEvents.length - visible.length
            return (
              <div
                className="planner-month-cell"
                data-other={!cell.cur}
                data-today={dk === today}
                key={`${dk}-${index}`}
                onClick={() => setExpandedDay(dk)}
              >
                <button
                  type="button"
                  className="planner-month-day-open"
                  onClick={(e) => { e.stopPropagation(); setExpandedDay(dk) }}
                  aria-label={`${longDayLabel(dk)}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}. View day`}
                >
                  <span className="planner-month-date">{cell.day}</span>
                  <span className="planner-month-day-dot" data-events={dayEvents.length > 0} aria-hidden="true" />
                </button>
                <span className="planner-month-events">
                  {visible.map((event) => (
                    <button
                      type="button"
                      className="planner-month-chip"
                      style={{ '--event-color': event.color || 'var(--accent-planner)' }}
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditEvent(event)
                      }}
                    >
                      {event.time && <span className="planner-month-time">{formatTime(event.time)}</span>}
                      <span className="planner-month-title">{event.title}</span>
                    </button>
                  ))}
                  {overflow > 0 && (
                    <button
                      type="button"
                      className="planner-month-more"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedDay(dk)
                      }}
                    >
                      +{overflow} more
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {expandedDay && (
        <Modal onClose={() => setExpandedDay(null)} width="min(420px, 100%)">
          <button className="icon-btn modal-close" onClick={() => setExpandedDay(null)} aria-label="Close">
            <X aria-hidden="true" />
          </button>
          <h3>{longDayLabel(expandedDay)}</h3>
          {!(eventsByDate.get(expandedDay) || []).length && <p className="empty-inline">No events planned.</p>}
          <div className="calendar-day-list">
            {(eventsByDate.get(expandedDay) || []).map((event) => (
              <button
                type="button"
                className="planner-month-chip calendar-day-list-chip"
                style={{ '--event-color': event.color || 'var(--accent-planner)' }}
                key={event.id}
                onClick={() => {
                  setExpandedDay(null)
                  onEditEvent(event)
                }}
              >
                {event.time && <span className="planner-month-time">{formatTime(event.time)}</span>}
                <span className="planner-month-title">{event.title}</span>
              </button>
            ))}
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                const dk = expandedDay
                setExpandedDay(null)
                onAddEvent(dk)
              }}
            >
              <Plus aria-hidden="true" size={15} /> Add event
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
