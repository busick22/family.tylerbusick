// Add/edit a calendar event: title, date/time, location, notes, color,
// who's involved, and an optional push to the shared Google Calendar.

import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { useEvents } from '../../state/EventsContext.jsx'
import { useMembers } from '../../state/MembersContext.jsx'
import { normalizeMemberList, todayStr } from '../../lib/family.js'
import { addToGoogleCalendar, deleteFromGoogleCalendar } from '../../lib/gcal.js'

// The event colour swatches. Lived in plannerUtils.js until the planning
// redesign retired that file's other helpers along with the old Planner page.
const EVENT_COLORS = [
  '#2563eb', '#7c3aed', '#ea580c', '#16a34a', '#db2777', '#0891b2', '#d97706',
]

export default function EventModal({ event, onClose, showNotice }) {
  const { addEvent, updateEvent, deleteEvent } = useEvents()
  const { members } = useMembers()
  const editing = Boolean(event?.id)

  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(event?.date || todayStr())
  const [time, setTime] = useState(event?.time || '')
  const [location, setLocation] = useState(event?.location || '')
  const [notes, setNotes] = useState(event?.notes || '')
  const [color, setColor] = useState(event?.color || EVENT_COLORS[0])
  const [who, setWho] = useState(event?.who ? [...event.who] : [])
  const [syncGcal, setSyncGcal] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  function toggleWho(name) {
    setWho((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]))
  }

  async function save() {
    const trimmed = title.trim()
    if (!trimmed || !date) {
      showNotice('Please add a title and date.', 'error')
      return
    }
    const data = {
      title: trimmed,
      date,
      time: time || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      color,
      who: normalizeMemberList(who),
    }
    setBusy(true)
    try {
      let eventId = event?.id
      if (editing) await updateEvent(eventId, data)
      else eventId = await addEvent(data)

      if (syncGcal) {
        showNotice('Saving to Google Calendar…', 'info')
        const gcalId = await addToGoogleCalendar(data)
        if (gcalId) {
          await updateEvent(eventId, { gcalEventId: gcalId })
          showNotice('Event saved to Google Calendar! ✓', 'success')
        } else {
          showNotice("Saved locally — couldn't reach Google Calendar.", 'error')
        }
      } else {
        showNotice('Event saved.', 'success')
      }
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't save that event.", 'error')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setBusy(true)
    try {
      if (event?.gcalEventId) await deleteFromGoogleCalendar(event.gcalEventId)
      await deleteEvent(event.id)
      showNotice('Event deleted.', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showNotice("Couldn't delete that event.", 'error')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} width="min(480px, 100%)">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <h3>{editing ? 'Edit Event' : 'Add Event'}</h3>

      <label className="field-label" htmlFor="ev-title">Title *</label>
      <input
        id="ev-title"
        className="field"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Soccer practice"
        autoFocus
      />

      <div className="form-2col">
        <div>
          <label className="field-label" htmlFor="ev-date">Date *</label>
          <input
            id="ev-date"
            type="date"
            className="field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="ev-time">Time</label>
          <input
            id="ev-time"
            type="time"
            className="field"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      <label className="field-label" htmlFor="ev-location">Location</label>
      <input
        id="ev-location"
        className="field"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Optional"
      />

      <span className="field-label">Color</span>
      <div className="color-picker" role="radiogroup" aria-label="Event color">
        {EVENT_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            className="color-dot"
            data-selected={color === c}
            style={{ background: c }}
            onClick={() => setColor(c)}
            role="radio"
            aria-checked={color === c}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      <span className="field-label">Who&rsquo;s involved</span>
      {members.length ? (
        <div className="who-picker">
          {members.map((m) => (
            <button
              type="button"
              key={m}
              className="chip"
              data-active={who.includes(m)}
              onClick={() => toggleWho(m)}
            >
              {m}
            </button>
          ))}
        </div>
      ) : (
        <p className="planner-empty" style={{ padding: '4px 0' }}>
          Add members first (Family Settings)
        </p>
      )}

      <label className="field-label" htmlFor="ev-notes">Notes</label>
      <textarea
        id="ev-notes"
        className="field event-notes-field"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional"
      />

      <label className="check-row">
        <input type="checkbox" checked={syncGcal} onChange={(e) => setSyncGcal(e.target.checked)} />
        Also add to the family Google Calendar
      </label>

      <div className="modal-actions">
        {editing && (
          <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
            {confirmingDelete ? 'Really delete?' : 'Delete'}
          </button>
        )}
        <span className="modal-actions-gap" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          Save event
        </button>
      </div>
    </Modal>
  )
}
