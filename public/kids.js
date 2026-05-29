import { db } from "./shared-firebase.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  DAYS, MONTHS, KIDS, MOVIE_TURN_ORDER, DOG_FEED_TURN_ORDER,
  esc, todayStr, normalizeMemberName as normalizeKidName,
  normalizeAssignment, resolveTurnIndex,
  confirmDialog, installErrorReporter,
  formatMs, playChime, primeAudio,
} from "./shared-utils.js";

installErrorReporter(db, addDoc, collection, serverTimestamp);

// ─────────────────────────────────────────────
//  SCREEN-TIME TIMER — module-level state
// ─────────────────────────────────────────────
// Per-kid default budgets. Used only when a kid has no screenTime doc yet
// in Firestore. Once a parent sets a budget, that value is stored and these
// defaults are no longer consulted for that kid.
const DEFAULT_BUDGETS_MS = {
  Liam:    40 * 60 * 1000,
  Livi:    40 * 60 * 1000,
  Spencer: 30 * 60 * 1000,
};
const FALLBACK_DAILY_BUDGET_MS = 60 * 60 * 1000;

let screenTimeByKid = {};      // { Liam: {...}, Livi: {...}, Spencer: {...} }
let screenTimeRequests = [];   // [{ id, kidName, requestedMs, createdAt }]
let timerTickHandle = null;    // setInterval handle for live display
let alarmFiredFor = new Set(); // doc IDs we've already chimed for, so we don't re-fire

function defaultScreenTime(kidName) {
  return {
    dailyBudgetMs: DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS,
    usedMsToday: 0,
    lastResetDate: todayStr(),
    activeSessionStart: null,
  };
}

function getScreenTimeFor(kidName) {
  return screenTimeByKid[kidName] || defaultScreenTime(kidName);
}

// Compute live remaining ms based on current wall-clock time.
// Handles auto-reset at midnight (returns reset state so callers can persist).
function computeTimerView(kidName) {
  const data = getScreenTimeFor(kidName);
  const today = todayStr();
  let usedMs = data.usedMsToday || 0;
  let needsReset = false;
  if (data.lastResetDate !== today) { usedMs = 0; needsReset = true; }
  const budget = data.dailyBudgetMs || DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS;
  let remaining = budget - usedMs;
  const running = !!data.activeSessionStart;
  if (running) remaining -= Math.max(0, Date.now() - data.activeSessionStart);
  return { remaining, budget, usedMs, running, needsReset };
}

async function ensureDailyReset(kidName) {
  const data = getScreenTimeFor(kidName);
  if (data.lastResetDate === todayStr()) return;
  try {
    await setDoc(doc(db, "screenTime", kidName), {
      ...data,
      usedMsToday: 0,
      lastResetDate: todayStr(),
      // Don't kill a session that's still running across midnight — but
      // anchor it to "now" so the kid doesn't lose all of yesterday's
      // session time into today's budget.
      activeSessionStart: data.activeSessionStart ? Date.now() : null,
    }, { merge: true });
  } catch (e) { console.error("daily reset failed", kidName, e); }
}

async function timerStartPause() {
  if (!kid) return;
  primeAudio(); // arm AudioContext on first interaction (iOS)
  const data = getScreenTimeFor(kid);
  const view = computeTimerView(kid);
  if (view.remaining <= 0 && !view.running) {
    toast("Time's up for today — ask a parent for more.");
    return;
  }
  try {
    if (view.running) {
      // Pause: bank elapsed into usedMsToday
      const elapsed = Date.now() - data.activeSessionStart;
      const today = todayStr();
      const baseUsed = data.lastResetDate === today ? (data.usedMsToday || 0) : 0;
      await setDoc(doc(db, "screenTime", kid), {
        ...data,
        usedMsToday: baseUsed + Math.max(0, elapsed),
        lastResetDate: today,
        activeSessionStart: null,
      }, { merge: true });
    } else {
      await setDoc(doc(db, "screenTime", kid), {
        ...data,
        lastResetDate: todayStr(),
        activeSessionStart: Date.now(),
      }, { merge: true });
      // New session — clear the alarm-fired guard so we can chime again later.
      alarmFiredFor.delete(kid);
    }
  } catch (e) { console.error("timer toggle failed", e); toast("Couldn't update the timer."); }
}

// Called by the local tick when remaining hits 0 while running.
async function timerAutoExpire() {
  if (!kid) return;
  const data = getScreenTimeFor(kid);
  if (!data.activeSessionStart) return;
  if (alarmFiredFor.has(kid)) return;
  alarmFiredFor.add(kid);
  playChime();
  try {
    await setDoc(doc(db, "screenTime", kid), {
      ...data,
      usedMsToday: data.dailyBudgetMs || DEFAULT_BUDGETS_MS[kid] || FALLBACK_DAILY_BUDGET_MS,
      lastResetDate: todayStr(),
      activeSessionStart: null,
    }, { merge: true });
  } catch (e) { console.error("auto-expire failed", e); }
}

function renderTimerCard() {
  const card = document.getElementById("timer-card");
  if (!card) return;
  if (!kid) { card.style.display = "none"; return; }
  card.style.display = "";

  const view = computeTimerView(kid);
  if (view.needsReset) ensureDailyReset(kid); // fire-and-forget

  const displayEl = document.getElementById("timer-display");
  const subEl = document.getElementById("timer-sub");
  const statusEl = document.getElementById("timer-status");
  const startBtn = document.getElementById("timer-start-btn");
  const expiredBlock = document.getElementById("timer-expired-block");

  const remaining = Math.max(0, view.remaining);
  const expired = remaining <= 0;

  displayEl.textContent = formatMs(remaining);
  displayEl.classList.toggle("expired", expired);

  const budgetMin = Math.round((view.budget || 0) / 60000);
  const usedMin = Math.round(Math.min(view.budget, view.budget - remaining) / 60000);
  subEl.textContent = `${usedMin} of ${budgetMin} min used today`;

  statusEl.className = "timer-card-status";
  if (expired) { statusEl.textContent = "Time's up"; statusEl.classList.add("expired"); }
  else if (view.running) { statusEl.textContent = "Running"; statusEl.classList.add("running"); }
  else { statusEl.textContent = "Paused"; }

  startBtn.textContent = view.running ? "⏸ Pause" : (expired ? "Time's up" : "▶ Start");
  startBtn.disabled = expired && !view.running;

  // If we just hit zero while running, fire alarm + auto-stop.
  if (expired && view.running) timerAutoExpire();

  expiredBlock.innerHTML = expired
    ? `<div class="timer-expired-banner">
         <span class="timer-expired-banner-icon">⏰</span>
         <div class="timer-expired-banner-text">Time's up for today! Tap "More time" to ask a parent.</div>
       </div>`
    : "";
}

function startTimerTicker() {
  if (timerTickHandle) clearInterval(timerTickHandle);
  timerTickHandle = setInterval(() => {
    // Only ever needs to update if the kid is viewing the Today tab.
    if (!kid) return;
    renderTimerCard();
  }, 500);
}
function stopTimerTicker() {
  if (timerTickHandle) { clearInterval(timerTickHandle); timerTickHandle = null; }
}

// ── Kid asks for more time ─────────────────────────────
let timeRequestSelectedMins = 10;
function timerAskRequest() {
  if (!kid) return;
  primeAudio();
  document.querySelectorAll("#time-pick .k-time-pick-btn").forEach(btn => {
    const mins = Number(btn.dataset.mins);
    btn.classList.toggle("selected", mins === timeRequestSelectedMins);
    btn.onclick = () => {
      timeRequestSelectedMins = mins;
      document.querySelectorAll("#time-pick .k-time-pick-btn").forEach(b => b.classList.toggle("selected", Number(b.dataset.mins) === mins));
    };
  });
  document.getElementById("time-request-modal").classList.add("open");
}
function closeTimeRequestModal() {
  document.getElementById("time-request-modal").classList.remove("open");
}
async function submitTimeRequest() {
  if (!kid) return;
  try {
    await addDoc(collection(db, "screenTimeRequests"), {
      kidName: kid,
      requestedMs: timeRequestSelectedMins * 60000,
      createdAt: serverTimestamp(),
    });
    closeTimeRequestModal();
    toast(`Sent a request for ${timeRequestSelectedMins} more minutes.`);
  } catch (e) { console.error(e); toast("Couldn't send that request."); }
}

// ── Parent controls ─────────────────────────────────────
async function parentAdjustTime(kidName, deltaMs) {
  const data = getScreenTimeFor(kidName);
  const today = todayStr();
  const baseUsed = data.lastResetDate === today ? (data.usedMsToday || 0) : 0;
  // Positive delta = give them MORE time = subtract from usedMsToday.
  // Negative delta = take time AWAY = add to usedMsToday.
  const newUsed = Math.max(0, baseUsed - deltaMs);
  try {
    await setDoc(doc(db, "screenTime", kidName), {
      ...data,
      usedMsToday: newUsed,
      lastResetDate: today,
    }, { merge: true });
    alarmFiredFor.delete(kidName);
    toast(`${deltaMs > 0 ? "+" : ""}${Math.round(deltaMs / 60000)} min for ${kidName}.`);
  } catch (e) { console.error(e); toast("Couldn't adjust time."); }
}

async function parentResetScreenTime(kidName) {
  if (!await confirmDialog(`Reset ${kidName}'s screen time used today to 0?`, { confirmText: "Reset", danger: false })) return;
  const data = getScreenTimeFor(kidName);
  try {
    await setDoc(doc(db, "screenTime", kidName), {
      ...data,
      usedMsToday: 0,
      lastResetDate: todayStr(),
      activeSessionStart: null,
    }, { merge: true });
    alarmFiredFor.delete(kidName);
  } catch (e) { console.error(e); toast("Couldn't reset."); }
}

let budgetModalKid = null;
function parentOpenBudget(kidName) {
  budgetModalKid = kidName;
  const data = getScreenTimeFor(kidName);
  document.getElementById("budget-kid").value = kidName;
  document.getElementById("budget-mins").value = Math.round((data.dailyBudgetMs || DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS) / 60000);
  document.getElementById("budget-modal").classList.add("open");
  setTimeout(() => document.getElementById("budget-mins").focus(), 30);
}
function closeBudgetModal() {
  document.getElementById("budget-modal").classList.remove("open");
  budgetModalKid = null;
}
async function saveBudget() {
  if (!budgetModalKid) return;
  const mins = Math.max(0, parseInt(document.getElementById("budget-mins").value, 10) || 0);
  const data = getScreenTimeFor(budgetModalKid);
  try {
    await setDoc(doc(db, "screenTime", budgetModalKid), {
      ...data,
      dailyBudgetMs: mins * 60000,
      lastResetDate: data.lastResetDate || todayStr(),
    }, { merge: true });
    toast(`${budgetModalKid}'s budget set to ${mins} min/day.`);
    closeBudgetModal();
  } catch (e) { console.error(e); toast("Couldn't save the budget."); }
}

async function parentGrantRequest(reqId, kidName, ms) {
  await parentAdjustTime(kidName, ms);
  try { await deleteDoc(doc(db, "screenTimeRequests", reqId)); }
  catch (e) { console.error(e); }
}
async function parentDenyRequest(reqId) {
  try { await deleteDoc(doc(db, "screenTimeRequests", reqId)); toast("Request denied."); }
  catch (e) { console.error(e); toast("Couldn't deny."); }
}

function renderParentScreenTime() {
  // Always refresh the dashboard tile summary as state moves.
  renderParentTiles();
  // Pending modal listens for time-request changes too.
  if (openParentTileName === "pending") renderPendingModal();
  const rowsEl = document.getElementById("parent-st-rows");
  if (!rowsEl) return;
  rowsEl.innerHTML = KIDS.map(name => {
    const view = computeTimerView(name);
    const data = getScreenTimeFor(name);
    const budgetMin = Math.round((view.budget || 0) / 60000);
    const usedMin = Math.round(Math.min(view.budget, view.budget - view.remaining) / 60000);
    const expired = view.remaining <= 0;
    const cls = expired ? "expired" : view.running ? "running" : "";
    const status = expired ? "Time's up" : view.running ? "Running" : "Paused";
    return `<div class="parent-st-row">
      <div class="parent-st-kid">${esc(name)}</div>
      <div class="parent-st-readout">
        <span class="parent-st-readout-time ${cls}">${formatMs(Math.max(0, view.remaining))} · ${status}</span>
        <span>${usedMin} of ${budgetMin} min used today</span>
      </div>
      <div class="parent-st-row-actions">
        <button class="parent-action-btn" data-st-add="${esc(name)}" data-st-mins="5" type="button">+5</button>
        <button class="parent-action-btn" data-st-add="${esc(name)}" data-st-mins="10" type="button">+10</button>
        <button class="parent-action-btn danger" data-st-add="${esc(name)}" data-st-mins="-10" type="button">−10</button>
        <button class="parent-action-btn danger" data-st-add="${esc(name)}" data-st-mins="-15" type="button">−15</button>
        <button class="parent-action-btn" data-st-reset="${esc(name)}" type="button">Reset</button>
        <button class="parent-action-btn" data-st-budget="${esc(name)}" type="button">Budget…</button>
      </div>
    </div>`;
  }).join("");
  rowsEl.querySelectorAll("[data-st-add]").forEach(btn =>
    btn.addEventListener("click", () => parentAdjustTime(btn.dataset.stAdd, Number(btn.dataset.stMins) * 60000)));
  rowsEl.querySelectorAll("[data-st-reset]").forEach(btn =>
    btn.addEventListener("click", () => parentResetScreenTime(btn.dataset.stReset)));
  rowsEl.querySelectorAll("[data-st-budget]").forEach(btn =>
    btn.addEventListener("click", () => parentOpenBudget(btn.dataset.stBudget)));
  // Time requests live in the Pending tile now — no inline list here.
}

const KID = {
  Liam: {
    emoji: "🧑‍🦰", color: "#5d9c2a",
    choreLabel: "Daily Quests", taskLabel: "Inventory",
    allDoneIcon: "🏆", allDoneMsg: "Achievement Unlocked!", allDoneSub: "You mined through it all!",
    tabToday: "⛏️ Today", tabMyStuff: "🎒 My Stuff", tabPoints: "⭐ Points", tabHistory: "📅 History",
    progressLabel: "XP Progress",
    toastDone: "Level Up! ⭐", toastTask: "Added to inventory!",
    emptyToday: "No quests today — go explore! 🌲",
    addPlaceholder: "New quest item…",
    addBtnColor: "#5d9c2a", addBtnTextColor: "white",
  },
  Livi: {
    emoji: "👩‍🦰", color: "#dc2626",
    choreLabel: "Chores", taskLabel: "My List",
    allDoneIcon: "🐞", allDoneMsg: "You did it! 🌸", allDoneSub: "Every spot is sparkling!",
    tabToday: "🌸 Today", tabMyStuff: "🌺 My Stuff", tabPoints: "⭐ Points", tabHistory: "📅 History",
    progressLabel: "Today's Progress",
    toastDone: "Great job! 🌟", toastTask: "Added! 🐞",
    emptyToday: "Nothing today — enjoy your day! 🦋",
    addPlaceholder: "Add a task…",
    addBtnColor: "#dc2626", addBtnTextColor: "white",
  },
  Spencer: {
    emoji: "👦🏼", color: "#ffe81f",
    choreLabel: "Assignments", taskLabel: "Mission Log",
    allDoneIcon: "🚀", allDoneMsg: "Mission Complete!", allDoneSub: "The Force is strong with you.",
    tabToday: "🚀 Today", tabMyStuff: "⭐ My Stuff", tabPoints: "⭐ Points", tabHistory: "📅 History",
    progressLabel: "Force Meter",
    toastDone: "Well done, Padawan! ⚡", toastTask: "Mission logged!",
    emptyToday: "No missions today — the galaxy awaits! 🌌",
    addPlaceholder: "Enter mission…",
    addBtnColor: "#ffe81f", addBtnTextColor: "#0a0e1a",
  },
};

let kid = null, chores = [], todos = [], meals = {}, rewards = [], pointsData = {}, members = [];
let movieTurnIndex = 0, dogFeedTurnIndex = 0;
let unsubs = [], selectorUnsubs = [], toastTimer = null, choreDay = "today";
let editingKidTaskId = null, editingKidChoreId = null;
let extrasCollapsed = true;
const TASK_COMPLETE_DELAY_MS = 60 * 60 * 1000;
const TASK_MINE_ANIMATION_MS = 520;
const pendingTaskTimers = new Map();
const finalizingTaskIds = new Set();
const animatingTaskIds = new Set();

function currentMoviePicker() { return MOVIE_TURN_ORDER[movieTurnIndex] || MOVIE_TURN_ORDER[0]; }
function currentDogFeeder() { return DOG_FEED_TURN_ORDER[dogFeedTurnIndex] || DOG_FEED_TURN_ORDER[0]; }

function getPendingDoneMs(task) {
  if (!task?.pendingDoneUntil) return null;
  if (typeof task.pendingDoneUntil === "number") return task.pendingDoneUntil;
  if (typeof task.pendingDoneUntil === "string") { const ms = Date.parse(task.pendingDoneUntil); return Number.isNaN(ms) ? null : ms; }
  if (typeof task.pendingDoneUntil === "object" && typeof task.pendingDoneUntil.seconds === "number") return task.pendingDoneUntil.seconds * 1000;
  return null;
}
function isTaskInUndoWindow(task) { const ms = getPendingDoneMs(task); return !!ms && ms > Date.now(); }
function isLegacyPendingTask(task) { return !task?.done && isTaskInUndoWindow(task); }
function isTaskChecked(task) { return !!task?.done || isLegacyPendingTask(task); }
function isTaskVisible(task) { return !task?.done || isTaskInUndoWindow(task); }
function taskShowsOn(task, date = todayStr()) { return !!task?.dueDate && task.dueDate <= date; }
function isOverdueChore(chore, todayIndex = new Date().getDay()) { const idx = DAYS.indexOf(chore?.day); return idx >= 0 && idx < todayIndex && !chore?.done; }
function clearPendingTaskTimers() { pendingTaskTimers.forEach(t => clearTimeout(t)); pendingTaskTimers.clear(); }

async function migrateLegacyPendingTask(id) {
  if (finalizingTaskIds.has(id)) return;
  const task = todos.find(t => t.id === id);
  const pendingMs = getPendingDoneMs(task);
  if (!task || task.done || !pendingMs) return;
  finalizingTaskIds.add(id);
  try {
    const completedBy = task.pendingDoneBy || kid || "";
    const stillVisible = pendingMs > Date.now();
    await updateDoc(doc(db, "todos", id), {
      done: true,
      completedAt: serverTimestamp(),
      completedBy: completedBy,
      pendingDoneUntil: stillVisible ? new Date(pendingMs).toISOString() : null,
      pendingDoneBy: stillVisible ? completedBy : "",
    });
    if ((task.points || 0) > 0 && completedBy) await awardPoints(completedBy, task.points || 0, task.text || "Task", "task", id);
  } catch (e) { console.error(e); }
  finally { finalizingTaskIds.delete(id); }
}
async function finalizePendingTask(id) {
  if (finalizingTaskIds.has(id)) return;
  const task = todos.find(t => t.id === id);
  const pendingMs = getPendingDoneMs(task);
  if (!task || !task.done || !pendingMs || pendingMs > Date.now()) return;
  finalizingTaskIds.add(id);
  try { await updateDoc(doc(db, "todos", id), { pendingDoneUntil: null, pendingDoneBy: "" }); }
  catch (e) { console.error(e); }
  finally { finalizingTaskIds.delete(id); }
}
function syncPendingTaskTimers() {
  const activeIds = new Set();
  todos.forEach(task => {
    const pendingMs = getPendingDoneMs(task);
    if (!pendingMs) return;
    if (!task.done) { migrateLegacyPendingTask(task.id); return; }
    if (pendingMs <= Date.now()) { finalizePendingTask(task.id); return; }
    activeIds.add(task.id);
    if (pendingTaskTimers.has(task.id)) return;
    pendingTaskTimers.set(task.id, setTimeout(() => { pendingTaskTimers.delete(task.id); finalizePendingTask(task.id); }, pendingMs - Date.now()));
  });
  Array.from(pendingTaskTimers.keys()).forEach(id => { if (activeIds.has(id)) return; clearTimeout(pendingTaskTimers.get(id)); pendingTaskTimers.delete(id); });
}
function sortKidTasks(taskList) {
  return [...taskList].sort((a, b) => {
    const aChecked = isTaskChecked(a), bChecked = isTaskChecked(b);
    if (aChecked !== bChecked) return aChecked ? 1 : -1;
    const ad = a.dueDate || "9999-12-31", bd = b.dueDate || "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
}
function assignedTasksFor(kidName = kid) { return todos.filter(t => t.assignee === kidName && isTaskVisible(t) && taskShowsOn(t)); }
function assignedOpenTasksFor(kidName = kid) { return todos.filter(t => t.assignee === kidName && !isTaskChecked(t) && taskShowsOn(t)); }
function everyoneTasks() { return todos.filter(t => t.assignee === "Kids" && isTaskVisible(t) && (!t.dueDate || taskShowsOn(t))); }
function openEveryoneTasks() { return todos.filter(t => t.assignee === "Kids" && !isTaskChecked(t) && (!t.dueDate || taskShowsOn(t))); }
function taskShowLabel(dateStr) {
  if (!dateStr) return "";
  const dt = new Date(dateStr + "T12:00");
  if (dateStr < todayStr()) return `Overdue from ${dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  if (dateStr === todayStr()) return "Shows today";
  return `Shows ${dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
function taskPointsLabel(task) { return `${task?.points || 0} pts`; }

function choreRowMarkup(chore) {
  const menuId = `chore-${chore.id}`;
  return `<div class="k-row ${chore.done ? "done" : ""}">
    <input type="checkbox" class="k-check" ${chore.done ? "checked" : ""} onchange="toggleChore('${chore.id}',this.checked,this)" aria-label="Mark ${esc(chore.name)} ${chore.done ? "incomplete" : "complete"}"/>
    <div class="k-label">${esc(chore.name)}${chore.done ? `<span class="k-meta">✓ Done</span>` : isOverdueChore(chore) ? `<span class="k-meta">Overdue from ${esc(chore.day)}</span>` : ""}</div>
    <button type="button" class="k-row-menu-trigger" data-row-menu="${esc(menuId)}" onclick="toggleRowMenu(event,'${esc(menuId)}')" aria-label="Actions for chore ${esc(chore.name)}" aria-haspopup="menu">⋮</button>
    <div class="row-menu" id="row-menu-${esc(menuId)}" role="menu">
      <button type="button" role="menuitem" onclick="closeRowMenu();openKidChoreModal('${chore.id}')">✏️ Edit chore</button>
      <button type="button" role="menuitem" class="danger" onclick="closeRowMenu();deleteChore('${chore.id}')">🗑️ Delete chore</button>
    </div>
  </div>`;
}

function taskRowMarkup(task, { optional = false } = {}) {
  const menuId = `task-${task.id}`;
  return `<div class="k-row task-row ${isTaskChecked(task) ? "done" : ""}" data-task-row="${esc(task.id)}">
    <input type="checkbox" class="k-check" ${isTaskChecked(task) ? "checked" : ""} onchange="toggleTask('${task.id}',this.checked,this)" aria-label="Mark ${esc(task.text)} ${isTaskChecked(task) ? "incomplete" : "complete"}"/>
    <div class="k-label">${esc(task.text)}${optional ? `<span class="k-meta">Optional extra for any kid</span>` : ""}${task.dueDate ? `<span class="k-meta">${taskShowLabel(task.dueDate)}</span>` : ""}</div>
    <div class="task-points-chip">${esc(taskPointsLabel(task))}</div>
    <button type="button" class="k-row-menu-trigger" data-row-menu="${esc(menuId)}" onclick="toggleRowMenu(event,'${esc(menuId)}')" aria-label="Actions for task ${esc(task.text)}" aria-haspopup="menu">⋮</button>
    <div class="row-menu" id="row-menu-${esc(menuId)}" role="menu">
      <button type="button" role="menuitem" onclick="closeRowMenu();openKidTaskModal('${task.id}')">✏️ Edit task</button>
      <button type="button" role="menuitem" class="danger" onclick="closeRowMenu();deleteTask('${task.id}')">🗑️ Delete task</button>
    </div>
  </div>`;
}

// ── Row ⋮ menu wiring ────────────────────────────────────
let openRowMenuId = null;
function toggleRowMenu(event, id) {
  event.stopPropagation();
  if (openRowMenuId === id) { closeRowMenu(); return; }
  closeRowMenu();
  const trigger = event.currentTarget;
  const menu = document.getElementById(`row-menu-${id}`);
  if (!menu || !trigger) return;
  const rect = trigger.getBoundingClientRect();
  // Open above the trigger if there's not enough room below.
  const menuHeight = 100; // approx
  const menuWidth = 170;  // matches min-width + padding
  const openUp = rect.bottom + menuHeight + 8 > window.innerHeight;
  menu.style.top = openUp
    ? `${Math.max(8, rect.top - menuHeight)}px`
    : `${rect.bottom + 4}px`;
  // Right-align with the trigger, clamp inside viewport.
  const idealLeft = rect.right - menuWidth;
  menu.style.left = `${Math.max(8, Math.min(idealLeft, window.innerWidth - menuWidth - 8))}px`;
  menu.classList.add("open");
  trigger.classList.add("open");
  openRowMenuId = id;
}
function closeRowMenu() {
  if (!openRowMenuId) return;
  const menu = document.getElementById(`row-menu-${openRowMenuId}`);
  if (menu) menu.classList.remove("open");
  document.querySelectorAll(".k-row-menu-trigger.open").forEach(t => t.classList.remove("open"));
  openRowMenuId = null;
}
// Outside click + Escape close.
document.addEventListener("click", e => {
  if (!openRowMenuId) return;
  const menu = document.getElementById(`row-menu-${openRowMenuId}`);
  if (menu && menu.contains(e.target)) return;
  closeRowMenu();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeRowMenu(); });
window.addEventListener("scroll", () => closeRowMenu(), { passive: true });
window.addEventListener("resize", () => closeRowMenu());

function taskSectionMarkup(title, taskList, { optional = false, emptyMessage = "" } = {}) {
  if (!taskList.length) {
    return emptyMessage ? `<div class="section-lbl">${title}</div><div class="kid-panel"><div class="k-empty">${emptyMessage}</div></div>` : "";
  }
  return `<div class="section-lbl">${title}</div><div class="kid-panel">${sortKidTasks(taskList).map(task => taskRowMarkup(task, { optional })).join("")}</div>`;
}

function extrasSectionMarkup(taskList) {
  if (!taskList.length) return "";
  return `
    <button type="button" class="section-toggle" onclick="toggleExtrasSection()" aria-expanded="${!extrasCollapsed}">
      <span class="section-toggle-copy">Everyone Extras</span>
      <span class="section-toggle-meta">${taskList.length} ${taskList.length === 1 ? "task" : "tasks"} · ${extrasCollapsed ? "Hidden" : "Open"}</span>
      <span class="section-toggle-caret">${extrasCollapsed ? "▸" : "▾"}</span>
    </button>
    ${extrasCollapsed ? "" : `<div class="kid-panel">${sortKidTasks(taskList).map(task => taskRowMarkup(task, { optional: true })).join("")}</div>`}
  `;
}

/* ── POINTS ── */
function getKidPoints(kidName) {
  const data = pointsData[kidName];
  if (!data) return 0;
  const earned = (data.history || []).reduce((s, e) => s + (e.points || 0), 0);
  const redeemed = (data.redeemed || []).reduce((s, e) => s + (e.cost || 0), 0);
  return Math.max(0, earned - redeemed);
}

async function awardPoints(kidName, pts, label, type, refId) {
  if (!pts || pts <= 0) return;
  const ref = doc(db, "kidPoints", kidName);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : { history: [], redeemed: [] };
  const history = [...(existing.history || [])];
  history.push({ points: pts, label, type, refId, date: todayStr(), ts: Date.now() });
  await setDoc(ref, { ...existing, history }, { merge: true });
}

async function revokePoints(kidName, type, refId) {
  if (!kidName) return;
  const ref = doc(db, "kidPoints", kidName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = snap.data();
  const history = [...(existing.history || [])];
  let removeIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.type === type && history[i]?.refId === refId) { removeIdx = i; break; }
  }
  if (removeIdx < 0) return;
  history.splice(removeIdx, 1);
  await setDoc(ref, { ...existing, history }, { merge: true });
}

async function deleteHistoryEntry(kidName, idx) {
  const ref = doc(db, "kidPoints", kidName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const history = [...(data.history || [])];
  history.splice(idx, 1);
  await setDoc(ref, { ...data, history }, { merge: true });
}

/* ── ANIMATIONS ── */
function createLiviParticles(row, originX, originY) {
  const colors = ["#dc2626", "#f87171", "#fca5a5", "#be185d", "#ffffff", "#dc2626", "#f472b6"];
  return Array.from({ length: 10 }, (_, i) => {
    const p = document.createElement("span"); p.className = "livi-particle";
    p.style.left = `${originX + (i % 2 === 0 ? -2 : 6)}px`; p.style.top = `${originY + ((i % 5) - 2) * 3}px`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", `${Math.round((Math.random() * 48) - 10)}px`);
    p.style.setProperty("--dy", `${Math.round((Math.random() * 32) - 28)}px`);
    row.appendChild(p); return p;
  });
}
const LIVI_ANIMATION_MS = 550; const liviAnimatingIds = new Set();
function animateLiviRow(rowEl, sourceEl) {
  if (!rowEl || liviAnimatingIds.has(rowEl)) return Promise.resolve();
  liviAnimatingIds.add(rowEl); rowEl.classList.add("livi-scatter");
  const cb = rowEl.querySelector(".k-check"); if (cb) cb.disabled = true;
  const rr = rowEl.getBoundingClientRect(); const sr = sourceEl?.getBoundingClientRect?.();
  const ox = sr ? Math.max(10, sr.left - rr.left + sr.width / 2 - 4) : 22;
  const oy = sr ? sr.top - rr.top + sr.height / 2 - 4 : rr.height / 2 - 4;
  const particles = createLiviParticles(rowEl, ox, oy);
  window.setTimeout(() => particles.forEach(p => p.remove()), LIVI_ANIMATION_MS + 40);
  return new Promise(resolve => window.setTimeout(() => { liviAnimatingIds.delete(rowEl); resolve(); }, LIVI_ANIMATION_MS));
}

const TIE_ANIMATION_MS = 650; const spencerAnimatingIds = new Set();
function animateSpencerRow(rowEl, sourceEl) {
  if (!rowEl || spencerAnimatingIds.has(rowEl)) return Promise.resolve();
  spencerAnimatingIds.add(rowEl); rowEl.classList.add("tie-flyby");
  const cb = rowEl.querySelector(".k-check"); if (cb) cb.disabled = true;
  const rr = rowEl.getBoundingClientRect(); const sr = sourceEl?.getBoundingClientRect?.();
  const oy = sr ? sr.top - rr.top + sr.height / 2 - 8 : rr.height / 2 - 8;
  const tie = document.createElement("span"); tie.className = "tie-fighter"; tie.textContent = "🛸";
  tie.style.top = `${oy}px`; tie.style.left = "0px"; rowEl.appendChild(tie);
  const trail = document.createElement("span"); trail.className = "tie-trail";
  trail.style.top = `${oy + 10}px`; trail.style.left = "0px";
  trail.style.background = "linear-gradient(90deg,transparent,rgba(255,232,31,0.7),rgba(255,232,31,0.2))";
  rowEl.appendChild(trail);
  window.setTimeout(() => { tie.remove(); trail.remove(); }, TIE_ANIMATION_MS + 40);
  return new Promise(resolve => window.setTimeout(() => { spencerAnimatingIds.delete(rowEl); resolve(); }, TIE_ANIMATION_MS));
}

function createLiamTaskParticles(row, originX, originY) {
  const colors = ["#88d85e", "#6fbf45", "#b6f18c", "#4a7f32", "#2d4b22"];
  return Array.from({ length: 10 }, (_, i) => {
    const p = document.createElement("span"); p.className = "minecraft-particle";
    p.style.left = `${originX + (i % 2 === 0 ? -2 : 6)}px`; p.style.top = `${originY + ((i % 5) - 2) * 3}px`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", `${Math.round((Math.random() * 44) - 8)}px`);
    p.style.setProperty("--dy", `${Math.round((Math.random() * 30) - 22)}px`);
    p.style.setProperty("--rot", `${Math.round((Math.random() * 180) - 90)}deg`);
    row.appendChild(p); return p;
  });
}
function animateLiamTaskMine(id, sourceEl) {
  if (kid !== "Liam" || animatingTaskIds.has(id)) return Promise.resolve();
  const rows = [...document.querySelectorAll(`[data-task-row="${id}"]`)];
  if (!rows.length) return Promise.resolve();
  animatingTaskIds.add(id);
  rows.forEach(row => {
    row.classList.add("minecraft-break");
    const cb = row.querySelector(".k-check"); if (cb) cb.disabled = true;
    const rr = row.getBoundingClientRect(); const sr = sourceEl?.getBoundingClientRect?.();
    const ox = sr ? Math.max(10, sr.left - rr.left + (sr.width / 2) - 4) : 22;
    const oy = sr ? sr.top - rr.top + (sr.height / 2) - 4 : (rr.height / 2) - 4;
    const particles = createLiamTaskParticles(row, ox, oy);
    window.setTimeout(() => particles.forEach(p => p.remove()), TASK_MINE_ANIMATION_MS + 40);
  });
  return new Promise(resolve => window.setTimeout(() => { animatingTaskIds.delete(id); resolve(); }, TASK_MINE_ANIMATION_MS));
}

function toast(msg) {
  clearTimeout(toastTimer);
  const t = document.getElementById("k-toast"); t.textContent = msg; t.classList.add("show");
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

/* ── RENDER ── */
function render() {
  if (!kid) return;
  renderTimerCard();
  renderMovieTurn();
  renderToday();
  renderPoints();
  renderHistory();
}

function renderSelectorBadges() {
  const dayName = DAYS[new Date().getDay()];
  const todayIndex = new Date().getDay();
  KIDS.forEach(name => {
    const el = document.getElementById(`sel-badge-${name}`); if (!el) return;
    const myChores = chores.filter(c => c.assignee === name && (c.day === dayName || isOverdueChore(c, todayIndex)));
    const myTasks = assignedOpenTasksFor(name);
    const openChores = myChores.filter(c => !c.done);
    const total = openChores.length + myTasks.length;
    const allDone = (myChores.length > 0 || myTasks.length > 0) && openChores.length === 0 && myTasks.length === 0;
    el.className = "kid-btn-badge";
    if (allDone) { el.textContent = "All done ✓"; el.classList.add("all-done"); }
    else if (total > 0) { el.textContent = `${total} today`; el.classList.add("has-items"); }
  });
}

function renderMovieTurn() {
  if (!kid) return;
  const current = currentMoviePicker(); const dogCurrent = currentDogFeeder();
  const mine = current === kid || dogCurrent === kid;
  const banner = document.getElementById("movie-turn-banner");
  banner.classList.toggle("my-turn", mine);
  document.getElementById("movie-turn-current").textContent = current;
  document.getElementById("dog-turn-current").textContent = dogCurrent;
}

function renderToday() {
  const dayName = DAYS[new Date().getDay()]; const today = todayStr(); const todayIndex = new Date().getDay(); const cfg = KID[kid];
  const allMyChores = chores.filter(c => c.assignee === kid);
  const focusChores = allMyChores.filter(c => c.day === dayName || isOverdueChore(c, todayIndex));
  const todayChores = allMyChores.filter(c => c.day === dayName);
  const myTasks = assignedTasksFor(kid);
  const openMyTasks = assignedOpenTasksFor(kid);
  const extraTasks = everyoneTasks();
  const openExtraTasks = openEveryoneTasks();
  const openFocusChores = focusChores.filter(c => !c.done);

  const doneChores = todayChores.filter(c => c.done).length;
  document.getElementById("progress-label-text").textContent = cfg.progressLabel;
  const strip = document.getElementById("progress-strip");
  if (todayChores.length) {
    strip.style.display = "block";
    document.getElementById("progress-fill").style.width = `${Math.round((doneChores / todayChores.length) * 100)}%`;
    document.getElementById("progress-count").textContent = `${doneChores} of ${todayChores.length} done`;
  } else { strip.style.display = "none"; }

  const meal = meals[today];
  document.getElementById("dinner-wrap").innerHTML = meal?.recipeName
    ? `<div class="dinner-banner" style="border-color:${cfg.color}40"><span class="dinner-icon">🍽️</span><div><div class="dinner-label" style="color:${cfg.color}">Tonight's Dinner</div><div class="dinner-meal" style="color:${cfg.color}">${esc(meal.recipeName)}</div></div></div>`
    : "";

  const activeDays = DAYS.filter(d => allMyChores.some(c => c.day === d));
  const filterRow = document.getElementById("today-chore-day-filter");
  if (activeDays.length > 1) {
    filterRow.style.display = "flex";
    filterRow.innerHTML = [
      `<button class="day-chip-btn ${choreDay === "today" ? "active" : ""}" onclick="setChoreDay('today')">Today</button>`,
      `<button class="day-chip-btn ${choreDay === "all" ? "active" : ""}" onclick="setChoreDay('all')">All Days</button>`,
      ...DAYS.filter(d => activeDays.includes(d) && d !== dayName).map(d => `<button class="day-chip-btn ${choreDay === d ? "active" : ""}" onclick="setChoreDay('${d}')">${d.slice(0, 3)}</button>`),
    ].join("");
  } else { filterRow.style.display = "none"; }

  const filterDay = choreDay === "today" ? dayName : (choreDay === "all" ? null : choreDay);
  const choresToShow = filterDay === dayName
    ? allMyChores.filter(c => c.day === dayName || isOverdueChore(c, todayIndex))
    : allMyChores.filter(c => filterDay === null || c.day === filterDay);

  const allDone = (choreDay === "today" || choreDay === dayName) && (focusChores.length > 0 || myTasks.length > 0 || extraTasks.length > 0) && openFocusChores.length === 0 && openMyTasks.length === 0 && openExtraTasks.length === 0;

  let html = "";
  if (allDone) {
    html += `<div class="all-done"><span class="all-done-icon">${cfg.allDoneIcon}</span><div class="all-done-title">${cfg.allDoneMsg}</div><div class="all-done-sub">${cfg.allDoneSub}</div></div>`;
  }

  if (!allDone && choresToShow.length) {
    if (choreDay === "all") {
      const today2 = dayName;
      DAYS.forEach(d => {
        const dc = choresToShow.filter(c => c.day === d); if (!dc.length) return;
        html += `<div class="kid-panel" style="margin-bottom:0.85rem"><div class="day-group-hdr ${d === today2 ? "today-hdr" : ""}">${d}${d === today2 ? " · Today" : ""}</div>`;
        html += dc.map(choreRowMarkup).join("");
        html += `</div>`;
      });
    } else {
      html += `<div class="section-lbl">${cfg.choreLabel}</div><div class="kid-panel">`;
      html += choresToShow.map(choreRowMarkup).join("");
      html += `</div>`;
    }
  }

  if (!allDone) {
    if (myTasks.length) html += taskSectionMarkup("Assigned to You", myTasks);
    if (extraTasks.length) html += extrasSectionMarkup(extraTasks);
  }

  if (!html) html = `<div class="k-empty" style="padding:2.5rem 1rem">${cfg.emptyToday}</div>`;
  document.getElementById("today-body").innerHTML = html;
}

function renderPoints() {
  if (!kid) return;
  const data = pointsData[kid] || { history: [], redeemed: [] };
  const earned = (data.history || []).reduce((s, e) => s + (e.points || 0), 0);
  const redeemedTotal = (data.redeemed || []).reduce((s, e) => s + (e.cost || 0), 0);
  const net = Math.max(0, earned - redeemedTotal);
  document.getElementById("points-total").textContent = net;
  document.getElementById("points-sub").textContent = net === 0 ? "Complete tasks and chores to earn points!" : `${earned} earned · ${redeemedTotal} redeemed`;

  const rewardsList = document.getElementById("rewards-list");
  const availableRewards = rewards.filter(r => !r.archived);
  if (!availableRewards.length) { rewardsList.innerHTML = `<div class="k-empty">No rewards set up yet — ask a parent!</div>`; }
  else {
    rewardsList.innerHTML = availableRewards.map(r => `
      <div class="reward-row">
        <span class="reward-icon">🎁</span>
        <div style="flex:1">
          <div class="reward-name">${esc(r.name)}</div>
        </div>
        <div class="reward-cost">${r.cost} pts</div>
      </div>`).join("");
  }

  const redeemedList = document.getElementById("redeemed-list");
  const kidRedeemed = (data.redeemed || []).slice().reverse();
  if (!kidRedeemed.length) { redeemedList.innerHTML = `<div class="k-empty" style="padding:0.85rem 1rem">Nothing redeemed yet.</div>`; }
  else {
    redeemedList.innerHTML = kidRedeemed.map(r => `
      <div class="reward-row">
        <span class="reward-icon">✅</span>
        <div style="flex:1">
          <div class="reward-name">${esc(r.name)}</div>
          <span class="reward-redeemed">${r.date || ""}</span>
        </div>
        <div class="reward-cost" style="color:var(--text-muted)">-${r.cost} pts</div>
      </div>`).join("");
  }
}

function renderHistory() {
  if (!kid) return;
  const data = pointsData[kid] || { history: [], redeemed: [] };
  const historyEntries = (data.history || []);
  const today = todayStr();
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = -13; i <= 6; i++) {
    const d = new Date(todayDate); d.setDate(d.getDate() + i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const body = document.getElementById("history-body");

  let html = "";
  const pastDays = days.filter(d => d <= today).reverse();
  const futureDays = days.filter(d => d > today);

  if (futureDays.length) {
    html += `<div class="hist-day"><div class="hist-day-hdr" style="margin-bottom:0.5rem">📅 Upcoming</div>`;
    futureDays.forEach(dateKey => {
      const d = new Date(dateKey + "T12:00");
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const dayOfWeek = DAYS[d.getDay()];
      const dayChores = chores.filter(c => c.assignee === kid && c.day === dayOfWeek);
      if (!dayChores.length) return;
      html += `<div style="margin-bottom:0.5rem"><div class="hist-day-hdr" style="font-size:0.62rem;margin-bottom:0.2rem">${dayLabel}</div>`;
      html += dayChores.map(c => `
        <div class="hist-item hist-upcoming">
          <span class="hist-status">⏳</span>
          <span class="hist-name">${esc(c.name)}</span>
          ${c.points ? `<span class="hist-pts">${c.points}pts</span>` : ""}
        </div>`).join("");
      html += `</div>`;
    });
    html += `</div>`;
  }

  pastDays.forEach(dateKey => {
    const d = new Date(dateKey + "T12:00");
    const isToday = dateKey === today;
    const dayLabel = isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    const dayOfWeek = DAYS[d.getDay()];

    const dayHistory = historyEntries.map((e, idx) => ({ ...e, _idx: idx })).filter(e => e.date === dateKey);
    const dayChores = chores.filter(c => c.assignee === kid && c.day === dayOfWeek);
    const completedRefIds = new Set(dayHistory.filter(e => e.type === "chore").map(e => e.refId));
    const missedChores = isToday ? [] : dayChores.filter(c => !completedRefIds.has(c.id) && !c.done && dateKey < today);

    if (!dayHistory.length && !missedChores.length) return;

    html += `<div class="hist-day">`;
    html += `<div class="hist-day-hdr${isToday ? " today-hdr" : ""}">${dayLabel}`;
    const dayPts = dayHistory.reduce((s, e) => s + (e.points || 0), 0);
    if (dayPts > 0) html += `<span style="font-size:0.7rem;color:var(--kc);font-weight:700">+${dayPts} pts</span>`;
    html += `</div>`;

    dayHistory.forEach(e => {
      html += `
        <div class="hist-item">
          <span class="hist-status">✅</span>
          <span class="hist-name">${esc(e.label)}</span>
          ${e.points ? `<span class="hist-pts">+${e.points}pts</span>` : ""}
          <button class="hist-del" onclick="deleteHistoryEntryUI('${esc(kid)}',${e._idx})" title="Remove" aria-label="Remove ${esc(e.label)}">✕</button>
        </div>`;
    });

    missedChores.forEach(c => {
      html += `
        <div class="hist-item">
          <span class="hist-status">❌</span>
          <span class="hist-name missed">${esc(c.name)}</span>
          ${c.points ? `<span class="hist-pts">${c.points}pts</span>` : ""}
          <button class="hist-complete-btn" onclick="toggleChore('${c.id}',true,null)">Complete now</button>
        </div>`;
    });

    html += `</div>`;
  });

  if (!html) html = `<div class="k-empty">No history yet — complete some tasks!</div>`;
  body.innerHTML = html;
}

/* ── MODAL ── */
function openKidTaskModal(id = null) {
  if (!kid) return;
  editingKidTaskId = id || null;
  const task = editingKidTaskId ? todos.find(t => t.id === editingKidTaskId) : null;
  document.getElementById("kid-task-title").textContent = task ? "Edit Task" : "Add Task";
  document.getElementById("kid-task-save").textContent = task ? "Save Changes" : "Save Task";
  document.getElementById("kid-task-delete").style.display = task ? "inline-flex" : "none";
  document.getElementById("kid-task-text").value = task?.text || "";
  document.getElementById("kid-task-due").value = task?.dueDate || todayStr();
  document.getElementById("kid-task-modal").classList.add("open");
  setTimeout(() => document.getElementById("kid-task-text").focus(), 40);
}
function closeKidTaskModal() { editingKidTaskId = null; document.getElementById("kid-task-modal").classList.remove("open"); }
async function saveKidTaskModal() {
  const text = document.getElementById("kid-task-text").value.trim();
  if (!text) { toast("Add a task first."); return; }
  const dueDate = document.getElementById("kid-task-due").value || null;
  if (editingKidTaskId) {
    try {
      await updateDoc(doc(db, "todos", editingKidTaskId), { text, dueDate, updatedAt: serverTimestamp() });
      toast("Task updated.");
      closeKidTaskModal();
    } catch (e) { console.error(e); toast("Couldn't update that task."); }
    return;
  }
  await addKidTask(text, dueDate);
  closeKidTaskModal();
}
async function deleteKidTask() {
  if (!editingKidTaskId) return;
  await deleteTask(editingKidTaskId);
}

function openKidChoreModal(id) {
  if (!kid || !id) return;
  editingKidChoreId = id;
  const chore = chores.find(c => c.id === id && c.assignee === kid);
  if (!chore) { editingKidChoreId = null; return; }
  document.getElementById("kid-chore-title").textContent = "Edit Chore";
  document.getElementById("kid-chore-name").value = chore.name || "";
  document.getElementById("kid-chore-day").innerHTML = DAYS.map(day => `<option value="${day}" ${chore.day === day ? "selected" : ""}>${day}</option>`).join("");
  document.getElementById("kid-chore-modal").classList.add("open");
  setTimeout(() => document.getElementById("kid-chore-name").focus(), 40);
}
function closeKidChoreModal() { editingKidChoreId = null; document.getElementById("kid-chore-modal").classList.remove("open"); }
async function saveKidChoreModal() {
  if (!editingKidChoreId) return;
  const name = document.getElementById("kid-chore-name").value.trim();
  const day = document.getElementById("kid-chore-day").value;
  if (!name) { toast("Add a chore name first."); return; }
  try {
    await updateDoc(doc(db, "chores", editingKidChoreId), { name, day, updatedAt: serverTimestamp() });
    toast("Chore updated.");
    closeKidChoreModal();
  } catch (e) { console.error(e); toast("Couldn't update that chore."); }
}
async function deleteKidChore() {
  if (!editingKidChoreId) return;
  await deleteChore(editingKidChoreId);
}

/* ── TOGGLE / ADD / DELETE ── */
async function toggleChore(id, done, inputEl) {
  const cfg = KID[kid];
  try {
    if (done) {
      const row = inputEl?.closest?.(".k-row");
      if (kid === "Livi") await animateLiviRow(row, inputEl);
      if (kid === "Spencer") await animateSpencerRow(row, inputEl);
      const chore = chores.find(c => c.id === id);
      await updateDoc(doc(db, "chores", id), { done: true, completedAt: serverTimestamp(), completedBy: kid });
      if (chore) {
        const pts = chore.points || 0;
        if (pts > 0) await awardPoints(kid, pts, chore.name || "Chore", "chore", id);
        toast(pts > 0 ? `${cfg.toastDone} +${pts}pts` : cfg.toastDone);
      } else { toast(cfg.toastDone); }
    } else {
      await updateDoc(doc(db, "chores", id), { done: false, completedAt: null, completedBy: "" });
    }
  } catch (e) { console.error(e); }
}

async function toggleTask(id, done, inputEl) {
  try {
    const cfg = KID[kid];
    const task = todos.find(t => t.id === id);
    const pts = task?.points || 0;
    if (done) {
      if (kid === "Livi") { const row = inputEl?.closest(".k-row"); await animateLiviRow(row, inputEl); }
      if (kid === "Spencer") { const row = inputEl?.closest(".k-row"); await animateSpencerRow(row, inputEl); }
      if (kid === "Liam") await animateLiamTaskMine(id, inputEl);
      await updateDoc(doc(db, "todos", id), {
        done: true,
        completedAt: serverTimestamp(),
        completedBy: kid,
        pendingDoneUntil: new Date(Date.now() + TASK_COMPLETE_DELAY_MS).toISOString(),
        pendingDoneBy: kid,
      });
      if (pts > 0) await awardPoints(kid, pts, task?.text || "Task", "task", id);
      toast(pts > 0 ? `${cfg.toastDone} +${pts}pts` : cfg.toastDone);
    } else {
      const awardedTo = task?.pendingDoneBy || task?.completedBy || kid;
      await updateDoc(doc(db, "todos", id), { done: false, completedAt: null, completedBy: "", pendingDoneUntil: null, pendingDoneBy: "" });
      if (pts > 0 && awardedTo) await revokePoints(awardedTo, "task", id);
      toast("Task moved back to active.");
    }
  } catch (e) { console.error(e); }
}

async function addKidTask(textOverride = null, dueDateOverride = null) {
  const cfg = KID[kid];
  const input = document.getElementById("task-input");
  const text = (textOverride ?? input.value).trim(); if (!text) return;
  const dueDate = dueDateOverride || null;
  try {
    await addDoc(collection(db, "todos"), { text, assignee: kid, dueDate, done: false, points: 0, createdAt: serverTimestamp() });
    if (textOverride === null) input.value = "";
    toast(cfg.toastTask);
  } catch (e) { console.error(e); }
}

async function deleteTask(id) {
  const task = todos.find(t => t.id === id);
  if (!task) return;
  if (!await confirmDialog("Delete this task?", { confirmText: "Delete", danger: true })) return;
  try {
    const awardedTo = task.pendingDoneBy || task.completedBy || "";
    if ((task.points || 0) > 0 && awardedTo && isTaskChecked(task)) await revokePoints(awardedTo, "task", id);
    await deleteDoc(doc(db, "todos", id));
    if (editingKidTaskId === id) closeKidTaskModal();
    toast("Task deleted.");
  } catch (e) { console.error(e); toast("Couldn't delete that task."); }
}
async function deleteChore(id) {
  const chore = chores.find(c => c.id === id && c.assignee === kid);
  if (!chore) return;
  if (!await confirmDialog("Delete this chore?", { confirmText: "Delete", danger: true })) return;
  try {
    await deleteDoc(doc(db, "chores", id));
    if (editingKidChoreId === id) closeKidChoreModal();
    toast("Chore deleted.");
  } catch (e) { console.error(e); toast("Couldn't delete that chore."); }
}
function setChoreDay(day) { choreDay = day; renderToday(); }
function toggleExtrasSection() { extrasCollapsed = !extrasCollapsed; renderToday(); }

/* ── SELECTOR TAB SWITCHING ── */
function switchSelTab(name, btnEl) {
  document.querySelectorAll(".sel-tab").forEach(t => t.classList.remove("active"));
  btnEl.classList.add("active");
  document.getElementById("sel-panel-kids").style.display = name === "kids" ? "flex" : "none";
  document.getElementById("sel-panel-parent").style.display = name === "parent" ? "flex" : "none";
  if (name === "parent") renderParentPanel();
}

/* ── PARENT PANEL ── */
function renderParentMembers() {
  const list = document.getElementById("parent-member-list");
  if (!list) return;
  if (!members.length) {
    list.innerHTML = `<span style="font-size:0.82rem;color:#94a3b8;font-style:italic">No members yet.</span>`;
    return;
  }
  const COLORS = ["#4a7c59", "#3a6ea5", "#c9622f", "#7c4fa0", "#b5732a", "#2a7c7c", "#a04f4f"];
  list.innerHTML = members.map((m, i) => `
    <span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.25rem 0.28rem 0.25rem 0.6rem;border-radius:4px;font-size:0.8rem;font-weight:700;color:white;background:${COLORS[i % COLORS.length]}">
      ${esc(m)}
      <button data-remove="${i}" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.6);font-size:0.72rem;padding:0.1rem 0.2rem;border-radius:3px;line-height:1" title="Remove member" aria-label="Remove ${esc(m)}">✕</button>
    </span>`).join("");
  list.querySelectorAll("[data-remove]").forEach(btn =>
    btn.addEventListener("click", () => parentRemoveMember(Number(btn.dataset.remove)))
  );
}

async function parentAddMember() {
  const input = document.getElementById("parent-member-input");
  const name = normalizeKidName(input.value);
  if (!name) return;
  if (members.includes(name)) { toast("That name is already added."); return; }
  try {
    await setDoc(doc(db, "settings", "members"), { list: [...members, name] });
    input.value = "";
  } catch (e) { console.error(e); toast("Couldn't save member."); }
}

async function parentRemoveMember(index) {
  try { await setDoc(doc(db, "settings", "members"), { list: members.filter((_, i) => i !== index) }); }
  catch (e) { console.error(e); toast("Couldn't remove member."); }
}

// ─────────────────────────────────────────────
//  PARENT PANEL — tile dashboard
//
//  renderParentPanel() now updates the 4 tile stats. The actual editing
//  controls live inside modals (rendered on open + on data changes if the
//  modal is currently visible).
// ─────────────────────────────────────────────
function pendingItems() {
  const items = [];
  Object.entries(pointsData).forEach(([kidName, data]) => {
    (data.pendingRedemptions || []).forEach((r, idx) =>
      items.push({ kind: "redeem", kidName, idx, name: r.name, cost: r.cost }));
  });
  screenTimeRequests.forEach(r =>
    items.push({ kind: "time", id: r.id, kidName: r.kidName, requestedMs: r.requestedMs, createdAt: r.createdAt }));
  return items;
}

function renderParentPanel() {
  renderParentTiles();
  // Keep open modals fresh as data changes underneath.
  KIDS.forEach(name => {
    const el = document.getElementById(`ppt-val-${name}`);
    if (el) {
      const data = pointsData[name] || { history: [], redeemed: [] };
      const earned = (data.history || []).reduce((s, e) => s + (e.points || 0), 0);
      const red = (data.redeemed || []).reduce((s, e) => s + (e.cost || 0), 0);
      el.textContent = Math.max(0, earned - red);
    }
  });
  if (openParentTileName === "members") renderParentMembers();
  if (openParentTileName === "screen-time") renderParentScreenTime();
  if (openParentTileName === "points") renderPointsModal();
  if (openParentTileName === "pending") renderPendingModal();
}

function renderParentTiles() {
  // Members
  const memEl = document.getElementById("tile-stat-members");
  if (memEl) memEl.textContent = members.length
    ? `${members.length} ${members.length === 1 ? "member" : "members"}`
    : "Add first member";

  // Screen Time — most-pressing kid summary
  const stEl = document.getElementById("tile-stat-screen-time");
  if (stEl) {
    const summaries = KIDS.map(name => {
      const v = computeTimerView(name);
      return { name, view: v };
    });
    const running = summaries.find(s => s.view.running);
    const expired = summaries.find(s => s.view.remaining <= 0);
    if (running) {
      stEl.textContent = `${running.name}: ${formatMs(Math.max(0, running.view.remaining))} left`;
    } else if (expired) {
      stEl.textContent = `${expired.name}: time's up`;
    } else {
      const totalMin = summaries.reduce((s, x) => s + Math.round(Math.max(0, x.view.remaining) / 60000), 0);
      stEl.textContent = `${totalMin} min left across kids`;
    }
  }

  // Points totals (compact)
  const ptsEl = document.getElementById("tile-stat-points");
  if (ptsEl) {
    const pts = KIDS.map(name => {
      const data = pointsData[name] || { history: [], redeemed: [] };
      const earned = (data.history || []).reduce((s, e) => s + (e.points || 0), 0);
      const red = (data.redeemed || []).reduce((s, e) => s + (e.cost || 0), 0);
      return `${name[0]}:${Math.max(0, earned - red)}`;
    });
    ptsEl.textContent = pts.join(" · ");
  }

  // Pending — count + urgency
  const pendEl = document.getElementById("tile-stat-pending");
  const pendTile = document.getElementById("parent-tile-pending");
  if (pendEl && pendTile) {
    const items = pendingItems();
    if (!items.length) {
      pendEl.textContent = "No requests";
      pendTile.classList.remove("urgent");
    } else {
      pendEl.textContent = `${items.length} ${items.length === 1 ? "request" : "requests"} waiting`;
      pendTile.classList.add("urgent");
    }
  }
}

// ── Tile modal open/close ───────────────────────────────
let openParentTileName = null;
function openParentTile(name) {
  const modal = document.getElementById(`parent-modal-${name}`);
  if (!modal) return;
  // Close any currently-open tile modal first.
  if (openParentTileName && openParentTileName !== name) closeParentTile();
  modal.classList.add("open");
  openParentTileName = name;
  // Populate the modal's content.
  if (name === "members") renderParentMembers();
  if (name === "screen-time") renderParentScreenTime();
  if (name === "points") renderPointsModal();
  if (name === "pending") renderPendingModal();
  // Move focus to the first focusable element inside the modal.
  setTimeout(() => {
    const f = modal.querySelector("input, button, select, textarea");
    if (f) f.focus();
  }, 40);
}
function closeParentTile() {
  if (!openParentTileName) return;
  const modal = document.getElementById(`parent-modal-${openParentTileName}`);
  if (modal) modal.classList.remove("open");
  openParentTileName = null;
}

// ── Within-modal tab switching (Points modal) ───────────
function setPointsTab(name, btn) {
  document.querySelectorAll("#parent-modal-points .k-modal-tab").forEach(t => t.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.querySelectorAll("#parent-modal-points .k-modal-pane").forEach(p =>
    p.classList.toggle("active", p.id === `pmt-${name}`));
}

// ── Points modal renderer ───────────────────────────────
function renderPointsModal() {
  // Overview tile values already updated by renderParentPanel.
  // Task point values
  const taskEl = document.getElementById("parent-task-points");
  const kidTodos = todos.filter(t => !t.done && (t.assignee === "Kids" || KIDS.includes(t.assignee)));
  if (taskEl) {
    taskEl.innerHTML = kidTodos.length
      ? kidTodos.map(t => `
        <div class="parent-pts-row">
          <span style="flex:1;font-weight:600">${esc(t.text)}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${esc(t.assignee)}</span>
          <input type="number" min="0" max="999" value="${t.points || 0}" onchange="parentSetPoints('todo','${t.id}',this.value)" title="Points" aria-label="Points for task ${esc(t.text)}"/>
          <span style="font-size:0.7rem;color:var(--text-muted)">pts</span>
        </div>`).join("")
      : `<p class="parent-empty">No tasks yet.</p>`;
  }

  // Chore point values
  const choreEl = document.getElementById("parent-chore-points");
  const kidChores = chores.filter(c => KIDS.includes(c.assignee));
  if (choreEl) {
    choreEl.innerHTML = kidChores.length
      ? kidChores.map(c => `
        <div class="parent-pts-row">
          <span style="flex:1;font-weight:600">${esc(c.name)}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${esc(c.assignee)} · ${esc(c.day || "")}</span>
          <input type="number" min="0" max="999" value="${c.points || 0}" onchange="parentSetPoints('chore','${c.id}',this.value)" title="Points" aria-label="Points for chore ${esc(c.name)}"/>
          <span style="font-size:0.7rem;color:var(--text-muted)">pts</span>
        </div>`).join("")
      : `<p class="parent-empty">No chores yet.</p>`;
  }

  // Rewards catalog
  const rwEl = document.getElementById("parent-rewards-list");
  const active = rewards.filter(r => !r.archived);
  if (rwEl) {
    rwEl.innerHTML = active.length
      ? active.map(r => `
        <div class="parent-pts-row">
          <span style="flex:1;font-weight:600">${esc(r.name)}</span>
          <span style="font-size:0.82rem;font-weight:700;color:var(--accent)">${r.cost}pts</span>
          <button class="parent-action-btn danger" style="padding:0.18rem 0.45rem;font-size:0.72rem" onclick="parentDeleteReward('${r.id}')" aria-label="Remove reward ${esc(r.name)}">✕</button>
        </div>`).join("")
      : `<p class="parent-empty">No rewards yet.</p>`;
  }
}

// ── Pending modal renderer (combines redemptions + time requests) ──
function renderPendingModal() {
  const el = document.getElementById("parent-pending-list");
  if (!el) return;
  const items = pendingItems();
  if (!items.length) {
    el.innerHTML = `<p class="parent-empty">No pending requests.</p>`;
    return;
  }
  el.innerHTML = items.map(item => {
    if (item.kind === "redeem") {
      return `<div class="parent-st-req">
        <div class="parent-st-req-text">🎁 <strong>${esc(item.kidName)}</strong> wants <strong>${esc(item.name)}</strong> · ${item.cost} pts</div>
        <button class="parent-action-btn" data-approve-redeem="${esc(item.kidName)}" data-approve-idx="${item.idx}" type="button">Approve</button>
        <button class="parent-action-btn danger" data-deny-redeem="${esc(item.kidName)}" data-deny-idx="${item.idx}" type="button">Deny</button>
      </div>`;
    }
    const mins = Math.round((item.requestedMs || 0) / 60000);
    return `<div class="parent-st-req">
      <div class="parent-st-req-text">⏰ <strong>${esc(item.kidName)}</strong> asked for <strong>+${mins} min</strong> of screen time</div>
      <button class="parent-action-btn" data-grant-time="${esc(item.id)}" data-grant-kid="${esc(item.kidName)}" data-grant-ms="${item.requestedMs}" type="button">Grant</button>
      <button class="parent-action-btn danger" data-deny-time="${esc(item.id)}" type="button">Deny</button>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-approve-redeem]").forEach(btn =>
    btn.addEventListener("click", () => parentApproveRedemption(btn.dataset.approveRedeem, Number(btn.dataset.approveIdx))));
  el.querySelectorAll("[data-deny-redeem]").forEach(btn =>
    btn.addEventListener("click", () => parentDenyRedemption(btn.dataset.denyRedeem, Number(btn.dataset.denyIdx))));
  el.querySelectorAll("[data-grant-time]").forEach(btn =>
    btn.addEventListener("click", () => parentGrantRequest(btn.dataset.grantTime, btn.dataset.grantKid, Number(btn.dataset.grantMs))));
  el.querySelectorAll("[data-deny-time]").forEach(btn =>
    btn.addEventListener("click", () => parentDenyRequest(btn.dataset.denyTime)));
}

async function parentSetPoints(type, id, value) {
  const pts = Math.max(0, parseInt(value, 10) || 0);
  try { await updateDoc(doc(db, type === "todo" ? "todos" : "chores", id), { points: pts }); }
  catch (e) { console.error(e); }
}

async function parentAddReward() {
  const name = document.getElementById("parent-reward-name").value.trim();
  const cost = Math.max(1, parseInt(document.getElementById("parent-reward-cost").value, 10) || 1);
  if (!name) return;
  try {
    await addDoc(collection(db, "rewards"), { name, cost, archived: false, createdAt: serverTimestamp() });
    document.getElementById("parent-reward-name").value = "";
    document.getElementById("parent-reward-cost").value = "";
    renderParentPanel();
  } catch (e) { console.error(e); }
}

async function parentDeleteReward(id) {
  try { await updateDoc(doc(db, "rewards", id), { archived: true }); renderParentPanel(); }
  catch (e) { console.error(e); }
}

let parentResetKidTarget = null;
function parentResetKid(name) { parentResetKidTarget = name; document.getElementById("parent-reset-label").textContent = `Reset ${name}'s points?`; document.getElementById("parent-reset-confirm").style.display = "flex"; }
function parentResetAll() { parentResetKidTarget = "all"; document.getElementById("parent-reset-label").textContent = "Reset ALL kids' points?"; document.getElementById("parent-reset-confirm").style.display = "flex"; }
function cancelParentReset() { document.getElementById("parent-reset-confirm").style.display = "none"; parentResetKidTarget = null; }
async function confirmParentReset() {
  cancelParentReset();
  const targets = parentResetKidTarget === "all" ? [...KIDS] : [parentResetKidTarget];
  try {
    await Promise.all(targets.map(n => setDoc(doc(db, "kidPoints", n), { history: [], redeemed: [], pendingRedemptions: [] })));
    renderParentPanel();
  } catch (e) { console.error(e); }
}

async function parentApproveRedemption(kidName, idx) {
  try {
    const ref = doc(db, "kidPoints", kidName); const snap = await getDoc(ref); if (!snap.exists()) return;
    const data = snap.data(); const pending = [...(data.pendingRedemptions || [])];
    const item = pending.splice(idx, 1)[0];
    const redeemed = [...(data.redeemed || []), { ...item, date: todayStr(), approvedAt: Date.now() }];
    await setDoc(ref, { ...data, pendingRedemptions: pending, redeemed }, { merge: true });
    renderParentPanel();
  } catch (e) { console.error(e); }
}

async function parentDenyRedemption(kidName, idx) {
  try {
    const ref = doc(db, "kidPoints", kidName); const snap = await getDoc(ref); if (!snap.exists()) return;
    const data = snap.data(); const pending = [...(data.pendingRedemptions || [])];
    pending.splice(idx, 1);
    await setDoc(ref, { ...data, pendingRedemptions: pending }, { merge: true });
    renderParentPanel();
  } catch (e) { console.error(e); }
}

/* ── NAV ── */
function switchKidTab(name, btnEl) {
  document.querySelectorAll(".kid-tab").forEach(t => t.classList.toggle("active", t.dataset.ktab === name));
  document.querySelectorAll(".kid-tab-content").forEach(t => t.classList.toggle("active", t.id === `ktab-${name}`));
  render();
}

function selectKid(name) {
  const normalizedName = normalizeKidName(name); if (!KID[normalizedName]) return;
  selectorUnsubs.forEach(u => u()); selectorUnsubs = [];
  kid = normalizedName; const cfg = KID[normalizedName];
  extrasCollapsed = true;
  document.body.className = `theme-${normalizedName}`;
  document.documentElement.style.setProperty("--kc", cfg.color);
  const btn = document.getElementById("task-add-btn");
  btn.style.background = cfg.addBtnColor; btn.style.color = cfg.addBtnTextColor;
  document.getElementById("task-input").placeholder = cfg.addPlaceholder;
  document.getElementById("hdr-emoji").textContent = cfg.emoji;
  document.getElementById("hdr-name").textContent = `Hi, ${normalizedName}!`;
  const now = new Date();
  document.getElementById("hdr-date").textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  document.getElementById("tab-today").textContent = cfg.tabToday;
  document.getElementById("tab-points").textContent = cfg.tabPoints;
  document.getElementById("tab-history").textContent = cfg.tabHistory;
  document.getElementById("selector").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.querySelectorAll(".sel-tab").forEach(t => t.classList.toggle("active", t.id === "sel-tab-kids"));
  document.getElementById("sel-panel-kids").style.display = "flex";
  document.getElementById("sel-panel-parent").style.display = "none";
  window.history.replaceState({}, "", `kids.html?kid=${encodeURIComponent(normalizedName)}`);
  start();
}

function goBack() {
  unsubs.forEach(u => u()); unsubs = []; clearPendingTaskTimers();
  stopTimerTicker();
  kid = null; choreDay = "today"; extrasCollapsed = true; document.body.className = "";
  document.getElementById("selector").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
  window.history.replaceState({}, "", "kids.html");
  document.querySelectorAll(".kid-tab").forEach(t => t.classList.toggle("active", t.dataset.ktab === "today"));
  document.querySelectorAll(".kid-tab-content").forEach(t => t.classList.toggle("active", t.id === "ktab-today"));
  startSelector();
}

function startSelector() {
  selectorUnsubs.forEach(u => u()); selectorUnsubs = [];
  selectorUnsubs.push(
    onSnapshot(doc(db, "settings", "members"), s => {
      members = s.exists() ? (s.data().list || []) : [];
      renderParentPanel();
    }),
    onSnapshot(collection(db, "chores"), s => { chores = s.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() })); renderSelectorBadges(); renderParentPanel(); }),
    onSnapshot(collection(db, "todos"), s => { todos = s.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() })); renderSelectorBadges(); renderParentPanel(); }),
    onSnapshot(collection(db, "rewards"), s => { rewards = s.docs.map(d => ({ id: d.id, ...d.data() })); renderParentPanel(); }),
    onSnapshot(collection(db, "screenTimeRequests"), s => {
      screenTimeRequests = s.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      renderParentPanel();
    }),
  );
  KIDS.forEach(name => {
    selectorUnsubs.push(
      onSnapshot(doc(db, "kidPoints", name), s => {
        pointsData[name] = s.exists() ? s.data() : { history: [], redeemed: [], pendingRedemptions: [] };
        renderSelectorBadges();
        renderParentPanel();
      }),
      onSnapshot(doc(db, "screenTime", name), s => {
        screenTimeByKid[name] = s.exists() ? s.data() : defaultScreenTime(name);
        renderParentPanel();
      }),
    );
  });
  // Initial paint so tiles show meaningful values before any data arrives.
  renderParentPanel();
}

function start() {
  unsubs.forEach(u => u()); unsubs = []; clearPendingTaskTimers();
  unsubs.push(
    onSnapshot(collection(db, "chores"), s => { chores = s.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() })); renderSelectorBadges(); render(); }),
    onSnapshot(collection(db, "todos"), s => { todos = s.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() })); syncPendingTaskTimers(); renderSelectorBadges(); render(); }),
    onSnapshot(collection(db, "meals"), s => { meals = {}; s.docs.forEach(d => { meals[d.id] = d.data(); }); render(); }),
    onSnapshot(collection(db, "rewards"), s => { rewards = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); }),
    onSnapshot(doc(db, "kidPoints", kid || "_"), s => {
      if (s.exists() && kid) { pointsData[kid] = s.data(); } else if (kid) { pointsData[kid] = { history: [], redeemed: [], pendingRedemptions: [] }; }
      renderPoints(); renderHistory();
    }),
    onSnapshot(doc(db, "settings", "movieTurn"), s => { movieTurnIndex = resolveTurnIndex(s.exists() ? s.data() : null, MOVIE_TURN_ORDER); renderMovieTurn(); }),
    onSnapshot(doc(db, "settings", "dogFeedTurn"), s => { dogFeedTurnIndex = resolveTurnIndex(s.exists() ? s.data() : null, DOG_FEED_TURN_ORDER); renderMovieTurn(); }),
    // Active kid's own screen-time doc — drives the timer card live.
    onSnapshot(doc(db, "screenTime", kid || "_"), s => {
      if (kid) {
        screenTimeByKid[kid] = s.exists() ? s.data() : defaultScreenTime(kid);
        renderTimerCard();
      }
    }),
  );
  startTimerTicker();
}

// Start selector listeners on page load
startSelector();

const urlKid = normalizeKidName(new URLSearchParams(location.search).get("kid"));
if (urlKid && KID[urlKid]) selectKid(urlKid);

document.getElementById("kid-task-modal").addEventListener("mousedown", e => { if (e.target === document.getElementById("kid-task-modal")) closeKidTaskModal(); });
document.getElementById("kid-chore-modal").addEventListener("mousedown", e => { if (e.target === document.getElementById("kid-chore-modal")) closeKidChoreModal(); });
document.getElementById("time-request-modal").addEventListener("mousedown", e => { if (e.target === document.getElementById("time-request-modal")) closeTimeRequestModal(); });
document.getElementById("budget-modal").addEventListener("mousedown", e => { if (e.target === document.getElementById("budget-modal")) closeBudgetModal(); });
// Parent tile modals
// Use "click" (not "mousedown") so iOS Safari's synthetic mousedown — which
// fires after the original click and lands on the now-visible overlay at the
// tap coordinates — doesn't immediately close the modal we just opened.
["members", "screen-time", "points", "pending"].forEach(name => {
  const el = document.getElementById(`parent-modal-${name}`);
  if (!el) return;
  el.addEventListener("click", e => { if (e.target === el) closeParentTile(); });
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeKidTaskModal();
    closeKidChoreModal();
    closeTimeRequestModal();
    closeBudgetModal();
    closeParentTile();
  }
});

window.selectKid = selectKid;
window.goBack = goBack;
window.switchKidTab = switchKidTab;
window.switchSelTab = switchSelTab;
window.toggleChore = toggleChore;
window.toggleTask = toggleTask;
window.addKidTask = addKidTask;
window.deleteTask = deleteTask;
window.deleteChore = deleteChore;
window.setChoreDay = setChoreDay;
window.toggleExtrasSection = toggleExtrasSection;
window.openKidTaskModal = openKidTaskModal;
window.closeKidTaskModal = closeKidTaskModal;
window.saveKidTaskModal = saveKidTaskModal;
window.deleteKidTask = deleteKidTask;
window.openKidChoreModal = openKidChoreModal;
window.closeKidChoreModal = closeKidChoreModal;
window.saveKidChoreModal = saveKidChoreModal;
window.deleteKidChore = deleteKidChore;
window.deleteHistoryEntryUI = async (kidName, idx) => { await deleteHistoryEntry(kidName, idx); };
window.parentSetPoints = parentSetPoints;
window.parentAddMember = parentAddMember;
window.parentAddReward = parentAddReward;
window.parentDeleteReward = parentDeleteReward;
window.parentResetKid = parentResetKid;
window.parentResetAll = parentResetAll;
window.cancelParentReset = cancelParentReset;
window.confirmParentReset = confirmParentReset;
window.parentApproveRedemption = parentApproveRedemption;
window.parentDenyRedemption = parentDenyRedemption;
// Row ⋮ menu
window.toggleRowMenu = toggleRowMenu;
window.closeRowMenu = closeRowMenu;
// Parent tile dashboard
window.openParentTile = openParentTile;
window.closeParentTile = closeParentTile;
window.setPointsTab = setPointsTab;
// Screen time
window.timerStartPause = timerStartPause;
window.timerAskRequest = timerAskRequest;
window.closeTimeRequestModal = closeTimeRequestModal;
window.submitTimeRequest = submitTimeRequest;
window.closeBudgetModal = closeBudgetModal;
window.saveBudget = saveBudget;
