// Shared utilities used across every page.
// Importable as ES module. Anything that is page-specific stays in that page's JS.

/* ── CONSTANTS ─────────────────────────────────────────── */
export const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];
export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Canonical list of kids — single source of truth.
export const KIDS = ["Liam", "Livi", "Spencer"];

// Turn rotations (separate from KIDS because order/membership differs).
export const MOVIE_TURN_ORDER = ["Livi", "Spencer", "Liam", "Parents"];
export const DOG_FEED_TURN_ORDER = ["Livi", "Spencer", "Liam"];

// Default human-readable status shown on the home kid cards.
export const KID_DEFAULT_STATUS = { Liam: "Age 10", Livi: "Age 8", Spencer: "Age 5" };

export const MEMBER_COLORS = [
  "#4a7c59", "#3a6ea5", "#c9622f", "#7c4fa0",
  "#b5732a", "#2a7c7c", "#a04f4f",
];

/* ── ESCAPING ──────────────────────────────────────────── */
export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── DATES ─────────────────────────────────────────────── */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Alias for older call sites.
export const todayKey = todayStr;

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatTime(timeStr) {
  if (!timeStr) return "All day";
  const [h, m] = String(timeStr).split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ── NAMES ─────────────────────────────────────────────── */
export function normalizeMemberName(name) {
  const raw = String(name ?? "").trim();
  if (!raw) return "";
  return ["alivia", "livi"].includes(raw.toLowerCase()) ? "Livi" : raw;
}

export function normalizeMemberList(list) {
  const normalized = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach(name => {
    const canonical = normalizeMemberName(name);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      normalized.push(canonical);
    }
  });
  return normalized;
}

export function normalizeAssignment(item) {
  return {
    ...item,
    assignee: normalizeMemberName(item.assignee),
    completedBy: normalizeMemberName(item.completedBy),
    pendingDoneBy: normalizeMemberName(item.pendingDoneBy),
  };
}

/* ── TURN INDEXING ─────────────────────────────────────── */
export function normalizeTurnIndex(value, order) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const idx = Math.trunc(n);
  return ((idx % order.length) + order.length) % order.length;
}

export function resolveTurnIndex(data, order) {
  if (!data || typeof data !== "object") return 0;
  const idx = normalizeTurnIndex(data.currentIndex, order);
  if (Array.isArray(data.order) && data.order.length) {
    const storedName = normalizeMemberName(data.order[idx]);
    const mapped = order.indexOf(storedName);
    if (mapped >= 0) return mapped;
  }
  return idx;
}

/* ── PAGE NOTICE ───────────────────────────────────────── */
// Wraps the standard .page-notice element. Pages should call once on load to bind.
let _noticeEl = null;
let _noticeTimer = null;
export function bindPageNotice(el = document.getElementById("page-notice")) {
  _noticeEl = el;
}
export function showNotice(msg, type = "info", duration = 3200) {
  if (!_noticeEl) _noticeEl = document.getElementById("page-notice");
  if (!_noticeEl) return;
  clearTimeout(_noticeTimer);
  _noticeEl.textContent = msg;
  _noticeEl.className = `page-notice ${type} show`;
  _noticeTimer = setTimeout(() => {
    _noticeEl.className = "page-notice";
  }, duration);
}

/* ── ACCOUNT MENU ──────────────────────────────────────── */
// Shared account dropdown logic. Pages just call wireAccountMenu() once.
export function closeAccountMenu() {
  const menu = document.getElementById("account-menu");
  if (!menu) return;
  menu.classList.remove("open");
  const trigger = menu.querySelector(".account-trigger");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

export function toggleAccountMenu(event) {
  event?.stopPropagation();
  const menu = document.getElementById("account-menu");
  if (!menu) return;
  const willOpen = !menu.classList.contains("open");
  closeAccountMenu();
  if (willOpen) {
    menu.classList.add("open");
    const trigger = menu.querySelector(".account-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }
}

export function wireAccountMenu() {
  document.addEventListener("click", e => {
    const menu = document.getElementById("account-menu");
    if (!menu || menu.contains(e.target)) return;
    closeAccountMenu();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAccountMenu();
  });
  // Expose for onclick handlers in HTML.
  window.toggleAccountMenu = toggleAccountMenu;
}

/* ── TIMER / DURATION HELPERS ──────────────────────────── */
// Format milliseconds as mm:ss (or h:mm:ss past an hour). Used by the
// screen-time timer; safe for negative values (clamps to 0).
export function formatMs(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── ALARM CHIME (Web Audio synthesis) ─────────────────── */
// Lazy-init AudioContext so iOS Safari's autoplay rules don't block us.
// The context is created on the first call (which is always in response
// to a user gesture — the kid tapped Start) and reused thereafter.
let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx) return _audioCtx;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    _audioCtx = new C();
    return _audioCtx;
  } catch { return null; }
}

// Play a soft 3-tone bell chime. Call once per alarm event.
// Safe to call before any user gesture — will just fail quietly on iOS
// until the kid has interacted with the page.
export function playChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    // Major triad: A5, C#6, E6 — pleasant, attention-grabbing, not jarring.
    const notes = [
      { freq: 880,  start: 0.00, dur: 0.45 },
      { freq: 1109, start: 0.18, dur: 0.45 },
      { freq: 1319, start: 0.36, dur: 0.85 },
    ];
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      const t = now + n.start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.dur + 0.05);
    });
  } catch (e) { console.warn("playChime failed", e); }
}

// Call this from a click handler the first time the kid interacts
// with the timer, to prime the AudioContext on iOS.
export function primeAudio() { getAudioCtx(); }

/* ── CONFIRM DIALOG (replaces native confirm) ──────────── */
// Promise-based confirm. Returns true/false. Uses the same visual language
// as the inline-confirm pattern but as a centered modal overlay so it works
// from anywhere in the app (including nested modals).
//
//   if (await confirmDialog("Delete this recipe?")) { … }
//
// Options: { title, body, confirmText, cancelText, danger }
let _confirmOverlay = null;
export function confirmDialog(message, options = {}) {
  const {
    title = "",
    confirmText = "Yes",
    cancelText = "Cancel",
    danger = true,
  } = options;

  return new Promise(resolve => {
    if (!_confirmOverlay) {
      _confirmOverlay = document.createElement("div");
      _confirmOverlay.className = "confirm-overlay";
      _confirmOverlay.innerHTML = `
        <div class="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg">
          <div class="confirm-title" id="confirm-title"></div>
          <div class="confirm-msg" id="confirm-msg"></div>
          <div class="confirm-actions">
            <button type="button" class="confirm-btn confirm-cancel"></button>
            <button type="button" class="confirm-btn confirm-yes"></button>
          </div>
        </div>`;
      document.body.appendChild(_confirmOverlay);
    }

    const overlay = _confirmOverlay;
    const titleEl = overlay.querySelector("#confirm-title");
    const msgEl = overlay.querySelector("#confirm-msg");
    const yesBtn = overlay.querySelector(".confirm-yes");
    const cancelBtn = overlay.querySelector(".confirm-cancel");

    titleEl.textContent = title;
    titleEl.style.display = title ? "block" : "none";
    msgEl.textContent = message;
    yesBtn.textContent = confirmText;
    yesBtn.classList.toggle("danger", !!danger);
    cancelBtn.textContent = cancelText;

    function close(result) {
      overlay.classList.remove("open");
      yesBtn.removeEventListener("click", onYes);
      cancelBtn.removeEventListener("click", onNo);
      overlay.removeEventListener("mousedown", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    }
    function onYes() { close(true); }
    function onNo() { close(false); }
    function onBackdrop(e) { if (e.target === overlay) close(false); }
    function onKey(e) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }

    yesBtn.addEventListener("click", onYes);
    cancelBtn.addEventListener("click", onNo);
    overlay.addEventListener("mousedown", onBackdrop);
    document.addEventListener("keydown", onKey);
    overlay.classList.add("open");
    setTimeout(() => cancelBtn.focus(), 30);
  });
}

/* ── ERROR REPORTING ───────────────────────────────────── */
// Lazy-installs window.onerror + unhandledrejection handlers that write
// a single doc to the `errors` Firestore collection. Throttled so a runaway
// error loop can't burn quota.
let _errorReporterInstalled = false;
const _recentErrors = new Map(); // hash → ts
const ERROR_THROTTLE_MS = 60_000;

function hashErr(msg, src, line) {
  return `${msg}|${src}|${line}`;
}

export async function installErrorReporter(db, addDoc, collection, serverTimestamp) {
  if (_errorReporterInstalled) return;
  _errorReporterInstalled = true;

  async function report(payload) {
    try {
      const key = hashErr(payload.message, payload.source, payload.lineno);
      const now = Date.now();
      const last = _recentErrors.get(key);
      if (last && now - last < ERROR_THROTTLE_MS) return;
      _recentErrors.set(key, now);
      await addDoc(collection(db, "errors"), {
        ...payload,
        ts: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: location.href,
      });
    } catch {
      // never let error reporting crash the page
    }
  }

  window.addEventListener("error", e => {
    report({
      kind: "error",
      message: String(e.message || "Unknown error"),
      source: String(e.filename || ""),
      lineno: e.lineno || 0,
      colno: e.colno || 0,
      stack: e.error?.stack ? String(e.error.stack).slice(0, 2000) : "",
    });
  });

  window.addEventListener("unhandledrejection", e => {
    const r = e.reason;
    report({
      kind: "promise",
      message: String(r?.message || r || "Unhandled rejection"),
      source: "",
      lineno: 0,
      colno: 0,
      stack: r?.stack ? String(r.stack).slice(0, 2000) : "",
    });
  });
}
