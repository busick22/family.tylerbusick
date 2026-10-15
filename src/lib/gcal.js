// Optional Google Calendar sync for planner events — a straight port of the
// old productivity.js integration. When "also add to Google Calendar" is
// checked, the event is written to the shared family calendar via the
// Calendar API; the OAuth consent popup appears on first use per session.
//
// The Google Identity Services script is loaded lazily, only when the
// family actually asks to sync — the rest of the app never pays for it.

const GCAL_CLIENT_ID = '960392900060-gb81dv1v2rff65fmf0r46r6vfdgjsl0q.apps.googleusercontent.com'
const GCAL_CALENDAR_ID = 'family01860224846748827125@group.calendar.google.com'
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'

let accessToken = null
let tokenClient = null
let gsiLoadPromise = null

function loadGsiScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gsiLoadPromise) return gsiLoadPromise
  gsiLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = resolve
    s.onerror = () => {
      gsiLoadPromise = null
      reject(new Error('Could not load Google sign-in script'))
    }
    document.head.appendChild(s)
  })
  return gsiLoadPromise
}

async function requestCalendarAccess() {
  if (accessToken) return accessToken
  await loadGsiScript()
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GCAL_CLIENT_ID,
        scope: GCAL_SCOPE,
        callback: () => {},
      })
    }
    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(resp)
        return
      }
      accessToken = resp.access_token
      resolve(accessToken)
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

// Returns the created Google Calendar event id, or null on failure.
export async function addToGoogleCalendar(eventData) {
  try {
    const token = await requestCalendarAccess()
    const gcalEvent = {
      summary: eventData.title,
      description: [eventData.notes || '', eventData.who?.length ? `Who: ${eventData.who.join(', ')}` : '']
        .filter(Boolean)
        .join('\n'),
      location: eventData.location || undefined,
    }
    if (eventData.time) {
      const startDT = `${eventData.date}T${eventData.time}:00`
      const start = new Date(`${eventData.date}T${eventData.time}`)
      start.setHours(start.getHours() + 1)
      const endTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      gcalEvent.start = { dateTime: startDT, timeZone: 'America/Chicago' }
      gcalEvent.end = { dateTime: `${eventData.date}T${endTime}:00`, timeZone: 'America/Chicago' }
    } else {
      gcalEvent.start = { date: eventData.date }
      gcalEvent.end = { date: eventData.date }
    }
    // Map our palette onto Google Calendar's fixed color ids.
    const colorMap = {
      '#2563eb': '9',
      '#7c3aed': '3',
      '#ea580c': '6',
      '#16a34a': '2',
      '#db2777': '4',
      '#0891b2': '7',
      '#d97706': '5',
    }
    if (colorMap[eventData.color]) gcalEvent.colorId = colorMap[eventData.color]

    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GCAL_CALENDAR_ID)}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gcalEvent),
      },
    )
    if (!resp.ok) {
      console.error('GCal API error:', await resp.json())
      return null
    }
    const created = await resp.json()
    return created.id
  } catch (e) {
    console.error('addToGoogleCalendar failed:', e)
    return null
  }
}

export async function deleteFromGoogleCalendar(gcalEventId) {
  if (!gcalEventId) return
  try {
    const token = await requestCalendarAccess()
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GCAL_CALENDAR_ID)}/events/${gcalEventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    )
  } catch (e) {
    console.error('deleteFromGoogleCalendar failed:', e)
  }
}
