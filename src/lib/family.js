// Shared constants and helpers used across every feature — the React
// equivalent of the old public/shared-utils.js. `esc()` is gone (React
// escapes text automatically); everything else is a straight port so the
// data shapes stay compatible with the existing Firestore documents.

export const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
]
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Canonical list of kids — single source of truth.
export const KIDS = ['Liam', 'Livi', 'Spencer']

// Turn rotations (separate from KIDS because order/membership differs).
export const MOVIE_TURN_ORDER = ['Livi', 'Spencer', 'Liam', 'Parents']
export const DOG_FEED_TURN_ORDER = ['Livi', 'Spencer', 'Liam']

// Default human-readable status shown on the home kid cards.
export const KID_DEFAULT_STATUS = { Liam: 'Age 10', Livi: 'Age 8', Spencer: 'Age 5' }

// Emoji avatar shown on the home kid cards (was hard-coded in index.html).
export const KID_EMOJI = { Liam: '🧑‍🦰', Livi: '👩‍🦰', Spencer: '👦🏼' }

export const MEMBER_COLORS = [
  '#4a7c59', '#3a6ea5', '#c9622f', '#7c4fa0',
  '#b5732a', '#2a7c7c', '#a04f4f',
]

/* ── DATES ─────────────────────────────────────────────── */
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatTime(timeStr) {
  if (!timeStr) return 'All day'
  const [h, m] = String(timeStr).split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/* ── NAMES ─────────────────────────────────────────────── */
export function normalizeMemberName(name) {
  const raw = String(name ?? '').trim()
  if (!raw) return ''
  return ['alivia', 'livi'].includes(raw.toLowerCase()) ? 'Livi' : raw
}

export function normalizeMemberList(list) {
  const normalized = []
  const seen = new Set()
  ;(Array.isArray(list) ? list : []).forEach((name) => {
    const canonical = normalizeMemberName(name)
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical)
      normalized.push(canonical)
    }
  })
  return normalized
}

export function normalizeAssignment(item) {
  return {
    ...item,
    assignee: normalizeMemberName(item.assignee),
    completedBy: normalizeMemberName(item.completedBy),
    pendingDoneBy: normalizeMemberName(item.pendingDoneBy),
  }
}

/* ── TURN INDEXING ─────────────────────────────────────── */
export function normalizeTurnIndex(value, order) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const idx = Math.trunc(n)
  return ((idx % order.length) + order.length) % order.length
}

export function resolveTurnIndex(data, order) {
  if (!data || typeof data !== 'object') return 0
  const idx = normalizeTurnIndex(data.currentIndex, order)
  if (Array.isArray(data.order) && data.order.length) {
    const storedName = normalizeMemberName(data.order[idx])
    const mapped = order.indexOf(storedName)
    if (mapped >= 0) return mapped
  }
  return idx
}

/* ── TIMER / DURATION HELPERS ──────────────────────────── */
// Format milliseconds as mm:ss (or h:mm:ss past an hour). Used by the
// screen-time timer; safe for negative values (clamps to 0).
export function formatMs(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
