import { auth, signOut as runSignOut, watchAuthState, db } from "./shared-firebase.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  DAYS, KIDS, MEMBER_COLORS,
  esc, todayStr, formatTime,
  normalizeMemberName, normalizeMemberList, normalizeAssignment,
  bindPageNotice, showNotice, wireAccountMenu,
  confirmDialog, installErrorReporter,
} from "./shared-utils.js";

bindPageNotice();
wireAccountMenu();
installErrorReporter(db, addDoc, collection, serverTimestamp);

const EVENT_COLORS = ["#2563eb", "#7c3aed", "#ea580c", "#16a34a", "#db2777", "#0891b2", "#d97706"];
const DEFAULT_TODO_LIST_ID = "general";
const TODO_COLLAPSE_STORAGE_KEY = "busick-family.todo-collapsed";
const TODO_VIEW_STORAGE_KEY = "busick-family.todo-view";
const LAST_ASSIGNEE_STORAGE_KEY = "busick-family.last-assignee";

// "Kids" is the assignee value meaning "any kid" — used by the 4th stack
// alongside the three individual kids.
const ANY_KID_ASSIGNEE = "Kids";
const KID_STACK_ASSIGNEES = [...KIDS, ANY_KID_ASSIGNEE];
const KID_STACK_EMOJI = { Liam: "🧑‍🦰", Livi: "👩‍🦰", Spencer: "👦🏼", Kids: "👪" };
const KID_STACK_LABEL = { Liam: "Liam", Livi: "Livi", Spencer: "Spencer", Kids: "Any kid" };

// Tasks assigned to one of the kid stacks should NOT clutter the parent board.
function isKidStackAssignee(name) {
  return KID_STACK_ASSIGNEES.includes(normalizeMemberName(name));
}

// Pseudo-list-id used by the collapse-state Set so kid stack collapse state
// persists in the same localStorage entry as user-defined lists.
function kidStackCollapseKey(name) { return `__kid:${name}`; }

// Last-used assignee — sticky between new-task additions.
function loadLastAssignee() {
  try { return localStorage.getItem(LAST_ASSIGNEE_STORAGE_KEY) || ""; }
  catch { return ""; }
}
function saveLastAssignee(name) {
  try { localStorage.setItem(LAST_ASSIGNEE_STORAGE_KEY, normalizeMemberName(name) || ""); }
  catch {}
}
let lastAssignee = loadLastAssignee();

function loadTodoView() {
  try {
    const value = localStorage.getItem(TODO_VIEW_STORAGE_KEY);
    return ["family", "kids", "all"].includes(value) ? value : "family";
  } catch { return "family"; }
}
function saveTodoView(view) {
  try { localStorage.setItem(TODO_VIEW_STORAGE_KEY, view); }
  catch {}
}

// Google Calendar API
const GCAL_CLIENT_ID = "960392900060-gb81dv1v2rff65fmf0r46r6vfdgjsl0q.apps.googleusercontent.com";
const GCAL_CALENDAR_ID = "family01860224846748827125@group.calendar.google.com";
const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";
let gcalAccessToken = null;
let tokenClient = null;

let members = [], todos = [], chores = [], events = [], todoLists = [];
let rewards = [], kidPointsData = {};
let todoFilter = "active", todoAssigneeFilter = "", choreAssigneeFilter = "", todoView = loadTodoView();
let editingTodoId = null, editingChoreId = null, editingEventId = null;
let selectedEventColor = EVENT_COLORS[0];
let listening = [], activeModalId = null;
let collapsedTodoLists = loadCollapsedTodoLists();
let draggingTodoListId = null;

function normalizeEvent(item) {
  return { ...item, who: normalizeMemberList(item.who) };
}

// ── Google Calendar API ──
function initTokenClient() {
  if (!window.google || tokenClient) return;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GCAL_CLIENT_ID,
    scope: GCAL_SCOPE,
    callback: resp => {
      if (resp.error) { console.error("GCal token error:", resp); return; }
      gcalAccessToken = resp.access_token;
    },
  });
}

function requestCalendarAccess() {
  return new Promise((resolve, reject) => {
    if (!window.google) { reject("Google API not loaded"); return; }
    initTokenClient();
    if (!tokenClient) { reject("Token client not initialized"); return; }
    tokenClient.callback = resp => {
      if (resp.error) { reject(resp); return; }
      gcalAccessToken = resp.access_token;
      resolve(resp.access_token);
    };
    if (gcalAccessToken) { resolve(gcalAccessToken); return; }
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

async function addToGoogleCalendar(eventData) {
  try {
    const token = await requestCalendarAccess();
    const gcalEvent = {
      summary: eventData.title,
      description: [
        eventData.notes || "",
        eventData.who?.length ? `Who: ${eventData.who.join(", ")}` : "",
      ].filter(Boolean).join("\n"),
      location: eventData.location || undefined,
    };
    if (eventData.time) {
      const startDT = `${eventData.date}T${eventData.time}:00`;
      const start = new Date(`${eventData.date}T${eventData.time}`);
      start.setHours(start.getHours() + 1);
      const endTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      const endDT = `${eventData.date}T${endTime}:00`;
      gcalEvent.start = { dateTime: startDT, timeZone: "America/Chicago" };
      gcalEvent.end = { dateTime: endDT, timeZone: "America/Chicago" };
    } else {
      gcalEvent.start = { date: eventData.date };
      gcalEvent.end = { date: eventData.date };
    }
    const colorMap = {
      "#2563eb": "9", "#7c3aed": "3", "#ea580c": "6",
      "#16a34a": "2", "#db2777": "4", "#0891b2": "7", "#d97706": "5",
    };
    if (colorMap[eventData.color]) gcalEvent.colorId = colorMap[eventData.color];
    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GCAL_CALENDAR_ID)}/events`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(gcalEvent),
      },
    );
    if (!resp.ok) { const err = await resp.json(); console.error("GCal API error:", err); return null; }
    const created = await resp.json();
    return created.id;
  } catch (e) { console.error("addToGoogleCalendar failed:", e); return null; }
}

async function deleteFromGoogleCalendar(gcalEventId) {
  if (!gcalEventId) return;
  try {
    const token = gcalAccessToken || await requestCalendarAccess();
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GCAL_CALENDAR_ID)}/events/${gcalEventId}`,
      { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } },
    );
  } catch (e) { console.error("deleteFromGoogleCalendar failed:", e); }
}

function normalizedTodoListId(v) {
  const id = String(v || "").trim();
  return id || DEFAULT_TODO_LIST_ID;
}

function loadCollapsedTodoLists() {
  try {
    const stored = JSON.parse(localStorage.getItem(TODO_COLLAPSE_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored.map(normalizedTodoListId) : []);
  } catch { return new Set(); }
}

function persistCollapsedTodoLists() {
  try { localStorage.setItem(TODO_COLLAPSE_STORAGE_KEY, JSON.stringify([...collapsedTodoLists])); }
  catch {}
}

function isTodoListCollapsed(id) {
  return collapsedTodoLists.has(normalizedTodoListId(id));
}

function toggleTodoListCollapsed(id) {
  const normalizedId = normalizedTodoListId(id);
  const isCollapsed = collapsedTodoLists.has(normalizedId);
  const card = document.querySelector(`[data-list-card="${CSS.escape(normalizedId)}"]`);
  const body = card ? card.querySelector(".todo-list-body") : null;
  const caret = card ? card.querySelector(".todo-list-caret") : null;
  const toggle = card ? card.querySelector("[data-list-toggle]") : null;

  if (body) {
    if (isCollapsed) {
      collapsedTodoLists.delete(normalizedId);
      body.removeAttribute("hidden");
      const targetH = body.scrollHeight;
      body.style.height = "0px";
      body.getBoundingClientRect();
      body.style.height = targetH + "px";
      body.addEventListener("transitionend", () => { body.style.height = ""; }, { once: true });
      if (caret) caret.textContent = "▾";
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    } else {
      collapsedTodoLists.add(normalizedId);
      body.style.height = body.scrollHeight + "px";
      body.getBoundingClientRect();
      body.style.height = "0px";
      body.addEventListener("transitionend", () => {
        body.setAttribute("hidden", "");
        body.style.height = "";
        const head = card.querySelector(".todo-list-head");
        if (head) {
          const rect = head.getBoundingClientRect();
          if (rect.top < 60) head.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, { once: true });
      if (caret) caret.textContent = "▸";
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  } else {
    if (isCollapsed) collapsedTodoLists.delete(normalizedId);
    else collapsedTodoLists.add(normalizedId);
    renderTodoList();
  }
  persistCollapsedTodoLists();

  if (card) {
    const meta = card.querySelector(".todo-list-meta");
    if (meta) {
      const visible = getVisibleTodos();
      const tasks = sortedTasksForList(visible, normalizedId);
      const activeTasks = tasks.filter(t => !t.done).length;
      const nowCollapsed = collapsedTodoLists.has(normalizedId);
      meta.textContent = nowCollapsed && activeTasks > 0
        ? `${activeTasks} active`
        : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
    }
  }
}

async function persistTodoListOrder(ids) {
  const orderedIds = ids.map(normalizedTodoListId);
  const metaById = new Map(normalizedTodoLists().map(list => [list.id, list]));
  try {
    await Promise.all(orderedIds.map((id, index) => {
      const list = metaById.get(id) || { id, name: id === DEFAULT_TODO_LIST_ID ? "General" : id };
      return setDoc(doc(db, "todoLists", id), {
        name: list.name || (id === DEFAULT_TODO_LIST_ID ? "General" : "Untitled"),
        order: index,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }));
  } catch (e) { console.error(e); showNotice("Couldn't save the new list order.", "error"); }
}

async function moveTodoList(draggedId, targetId) {
  const sourceId = normalizedTodoListId(draggedId);
  const destinationId = normalizedTodoListId(targetId);
  if (!sourceId || !destinationId || sourceId === destinationId) return;
  const orderedIds = normalizedTodoLists().map(l => l.id);
  const fromIndex = orderedIds.indexOf(sourceId);
  const toIndex = orderedIds.indexOf(destinationId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
  orderedIds.splice(toIndex, 0, orderedIds.splice(fromIndex, 1)[0]);
  await persistTodoListOrder(orderedIds);
}

function clearTodoListDropTargets() {
  document.querySelectorAll("#todo-list-panel .todo-list-card.drop-target").forEach(c => c.classList.remove("drop-target"));
}

function normalizedTodoLists() {
  const lists = todoLists.map(l => ({ ...l, id: normalizedTodoListId(l.id) }));
  if (!lists.some(l => l.id === DEFAULT_TODO_LIST_ID)) {
    lists.unshift({ id: DEFAULT_TODO_LIST_ID, name: "General", order: 0 });
  }
  return lists.sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 9999;
    const bo = Number.isFinite(b.order) ? b.order : 9999;
    if (ao !== bo) return ao - bo;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function getTodoListById(id) {
  return normalizedTodoLists().find(l => l.id === normalizedTodoListId(id)) || normalizedTodoLists()[0];
}

function todoListName(id) { return getTodoListById(id)?.name || "General"; }

function memberColor(name) {
  const i = members.indexOf(normalizeMemberName(name));
  return MEMBER_COLORS[i >= 0 ? i % MEMBER_COLORS.length : 0] || "#888";
}

function dateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const ts = todayStr();
  if (dateStr === ts) return "Shows today";
  if (dateStr < ts) return `Since ${dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return `Shows ${dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function dateClass(dateStr) {
  if (!dateStr) return "";
  const ts = todayStr();
  if (dateStr === ts) return "due-today";
  if (dateStr < ts) return "overdue";
  return "";
}

function isOverdueChore(chore, todayIndex = new Date().getDay()) {
  const idx = DAYS.indexOf(chore?.day);
  return idx >= 0 && idx < todayIndex && !chore?.done;
}

// ── Modal helpers ──
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove("open"); if (activeModalId === id) activeModalId = null; }
}
function openModal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.add("open"); activeModalId = id;
  setTimeout(() => { const f = m.querySelector("input,select"); if (f) f.focus(); }, 40);
}

function openQuickAddModal() { openModal("quick-add-modal"); }
function closeQuickAddModal() { closeModal("quick-add-modal"); }
function quickAddSelect(type) {
  closeQuickAddModal();
  if (type === "event") openEventModal();
  if (type === "todo") openTodoModal();
  if (type === "chore") openChoreModal();
}

function openTodoModal(id = null) {
  editingTodoId = id || null;
  const todo = editingTodoId ? todos.find(t => t.id === editingTodoId) : null;
  document.getElementById("todo-modal-title").textContent = todo ? "Edit Task" : "Add Task";
  document.getElementById("todo-save-btn").textContent = todo ? "Save Changes" : "Save Task";
  document.getElementById("todo-delete-btn").style.display = todo ? "inline-flex" : "none";
  document.getElementById("todo-m-text").value = todo?.text || "";
  document.getElementById("todo-m-due").value = todo?.dueDate || "";
  document.getElementById("todo-m-points").value = todo?.points ?? 0;
  renderAssigneeDropdowns();
  renderTodoListDropdowns();
  // For a new task, default to the last-used assignee; for an existing task,
  // honor whatever was already set.
  const defaultAssignee = todo ? (todo.assignee || "") : lastAssignee;
  document.getElementById("todo-m-assignee").value = defaultAssignee;
  document.getElementById("todo-m-list").value = normalizedTodoListId(todo?.listId);
  openModal("todo-modal");
}

function closeTodoModal() { editingTodoId = null; closeModal("todo-modal"); }

async function saveTodoFromModal() {
  const text = document.getElementById("todo-m-text").value.trim();
  if (!text) { showNotice("Please add a task name.", "error"); return; }
  const listId = normalizedTodoListId(document.getElementById("todo-m-list").value);
  const assignee = normalizeMemberName(document.getElementById("todo-m-assignee").value);
  const dueDate = document.getElementById("todo-m-due").value || null;
  const points = Math.max(0, parseInt(document.getElementById("todo-m-points").value, 10) || 0);
  const data = { text, listId, assignee, dueDate, points, updatedAt: serverTimestamp() };
  const isEditing = !!editingTodoId;
  try {
    if (isEditing) await updateDoc(doc(db, "todos", editingTodoId), data);
    else await addDoc(collection(db, "todos"), { ...data, done: false, createdAt: serverTimestamp() });
    // Remember this assignee for the next new task (sticky).
    if (!isEditing) { lastAssignee = assignee; saveLastAssignee(assignee); }
    closeTodoModal();
    showNotice(isEditing ? "Task updated." : "Task added.", "success");
  } catch (e) { console.error(e); showNotice(isEditing ? "Couldn't update that task." : "Couldn't add that task.", "error"); }
}

async function deleteTodoFromModal() {
  if (!editingTodoId) return;
  if (!await confirmDialog("Delete this task?", { confirmText: "Delete", danger: true })) return;
  try { await deleteDoc(doc(db, "todos", editingTodoId)); closeTodoModal(); showNotice("Task deleted.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't delete that task.", "error"); }
}

function openTodoListModal() {
  document.getElementById("todo-list-name").value = "";
  openModal("todo-list-modal");
}
function closeTodoListModal() { closeModal("todo-list-modal"); }

function todoListIdFromName(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || `list-${Date.now()}`;
}

async function saveTodoList() {
  const name = document.getElementById("todo-list-name").value.trim();
  if (!name) { showNotice("Please provide a list name.", "error"); return; }
  const existing = normalizedTodoLists();
  if (existing.some(l => String(l.name || "").toLowerCase() === name.toLowerCase())) {
    showNotice("That list name already exists.", "error"); return;
  }
  let id = todoListIdFromName(name);
  let n = 2;
  while (existing.some(l => l.id === id)) id = `${todoListIdFromName(name)}-${n++}`;
  const order = Math.max(0, ...existing.map(l => Number.isFinite(l.order) ? l.order : 0)) + 1;
  try {
    await setDoc(doc(db, "todoLists", id), { name, order, createdAt: serverTimestamp() }, { merge: true });
    closeTodoListModal();
    showNotice("List created.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't create that list.", "error"); }
}

async function deleteTodoList(id) {
  if (id === DEFAULT_TODO_LIST_ID) { showNotice("The General list can't be removed.", "error"); return; }
  const list = getTodoListById(id);
  if (!await confirmDialog(`Delete "${list?.name || "this list"}"? Tasks will move to General.`, { confirmText: "Delete list", danger: true })) return;
  const impacted = todos.filter(t => normalizedTodoListId(t.listId) === id);
  try {
    await Promise.all([
      ...impacted.map(t => updateDoc(doc(db, "todos", t.id), { listId: DEFAULT_TODO_LIST_ID })),
      deleteDoc(doc(db, "todoLists", id)),
    ]);
    collapsedTodoLists.delete(normalizedTodoListId(id));
    persistCollapsedTodoLists();
    showNotice("List removed. Tasks moved to General.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't delete that list.", "error"); }
}

function switchTab(name, btn) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  btn.classList.add("active");
}

function openSettingsPanel() {
  document.getElementById("settings-panel").classList.add("open");
}
function closeSettingsPanel() {
  document.getElementById("settings-panel").classList.remove("open");
}
document.getElementById("settings-panel").addEventListener("mousedown", e => {
  if (e.target === document.getElementById("settings-panel")) closeSettingsPanel();
});

function openInitialTabFromQuery() {
  const params = new URLSearchParams(location.search);
  if (params.get("settings") === "1") openSettingsPanel();
}

function clearListeners() { listening.forEach(s => s()); listening = []; }

function startListening() {
  clearListeners();
  listening.push(
    onSnapshot(doc(db, "settings", "members"), snap => {
      members = normalizeMemberList((snap.exists() && snap.data().list) || []);
      document.getElementById("setup-prompt").style.display = members.length ? "none" : "flex";
      renderMembers(); renderAssigneeDropdowns(); renderTodoListDropdowns();
      renderTodayFeed(); renderTodoList(); renderChoreList();
    }),
    onSnapshot(collection(db, "todos"), snap => {
      todos = snap.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() }));
      renderTodayFeed(); renderTodoList();
    }),
    onSnapshot(collection(db, "todoLists"), snap => {
      todoLists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTodoListDropdowns();
      renderTodoList();
    }),
    onSnapshot(collection(db, "chores"), snap => {
      chores = snap.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() }));
      renderTodayFeed(); renderChoreList();
    }),
    onSnapshot(collection(db, "events"), snap => {
      events = snap.docs.map(d => normalizeEvent({ id: d.id, ...d.data() }));
      renderTodayEvents();
    }),
    onSnapshot(collection(db, "rewards"), snap => {
      rewards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderRewardsCatalog();
    }),
    onSnapshot(collection(db, "kidPoints"), snap => {
      kidPointsData = {};
      snap.docs.forEach(d => { kidPointsData[d.id] = d.data(); });
      renderPendingRedemptions();
    }),
  );
}

/* ── TODAY TAB ── */
function renderTodayEvents() {
  const today = todayStr();
  const todayEvents = events
    .filter(e => e.date === today)
    .sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

  const feed = document.getElementById("today-events-feed");
  const label = document.getElementById("events-section-label");

  if (!todayEvents.length) { feed.innerHTML = ""; label.style.display = "none"; return; }

  label.style.display = "inline-block";
  feed.innerHTML = todayEvents.map(ev => `
    <div class="today-event-row">
      <div class="today-event-dot" style="background:${esc(ev.color || EVENT_COLORS[0])}"></div>
      <div class="today-event-time">${esc(formatTime(ev.time))}</div>
      <div class="today-event-info">
        <div class="today-event-title">${esc(ev.title)}</div>
        ${(ev.who || []).length ? `<div class="today-event-who">${ev.who.map(esc).join(", ")}</div>` : ""}
        ${ev.location ? `<div class="today-event-who">📍 ${esc(ev.location)}</div>` : ""}
      </div>
      <button class="today-event-del" data-del-event="${ev.id}" title="Remove event" aria-label="Remove event ${esc(ev.title)}">✕</button>
    </div>`).join("");

  feed.querySelectorAll("[data-del-event]").forEach(btn =>
    btn.addEventListener("click", () => deleteEventById(btn.dataset.delEvent)));

  updateFocusSectionLabel();
}

function updateFocusSectionLabel() {
  const evLabel = document.getElementById("events-section-label");
  const focusLabel = document.getElementById("focus-section-label");
  const hasEvents = evLabel.style.display !== "none";
  focusLabel.style.display = hasEvents ? "inline-block" : "none";
}

function renderTodayFeed() {
  const dayName = DAYS[new Date().getDay()];
  const todayIndex = new Date().getDay();
  document.getElementById("today-panel-title").textContent = `${dayName}'s Focus`;

  const choresToday = chores.filter(c => c.day === dayName || isOverdueChore(c, todayIndex));
  const today = todayStr();
  const openTasks = todos.filter(t => !t.done && !!t.dueDate && t.dueDate <= today);
  const allItems = [
    ...choresToday.map(c => ({
      kind: "chore", id: c.id, label: c.name, assignee: c.assignee,
      done: c.done, isOverdue: isOverdueChore(c, todayIndex), sortKey: DAYS.indexOf(c.day),
    })),
    ...openTasks.map(t => ({
      kind: "task", id: t.id, label: t.text, assignee: t.assignee,
      done: t.done, dueDate: t.dueDate, listId: normalizedTodoListId(t.listId),
    })),
  ];

  const feed = document.getElementById("today-feed");
  if (!allItems.length) {
    feed.innerHTML = `<p class="empty-msg">Nothing for today or overdue — enjoy the quiet! 🎉</p>`;
    document.getElementById("focus-section-label").style.display = "none";
    return;
  }
  allItems.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const aPri = a.kind === "task" ? (a.dueDate < today ? -1 : 0) : (a.isOverdue ? -1 : 0);
    const bPri = b.kind === "task" ? (b.dueDate < today ? -1 : 0) : (b.isOverdue ? -1 : 0);
    if (aPri !== bPri) return aPri - bPri;
    if (a.kind === "task" && b.kind === "task" && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.kind === "chore" && b.kind === "chore" && a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.label.localeCompare(b.label);
  });
  feed.innerHTML = allItems.map(item => `
    <div class="check-row ${item.done ? "done" : ""}" id="tf-${esc(item.id)}">
      <input type="checkbox" class="custom-check" ${item.done ? "checked" : ""} data-today-id="${esc(item.id)}" data-today-kind="${item.kind}" aria-label="Mark ${esc(item.label)} ${item.done ? "incomplete" : "complete"}"/>
      <span class="check-label">
        ${esc(item.label)}
        <span class="check-meta">${item.kind === "chore"
          ? `Chore${item.isOverdue ? " · Overdue" : ""}`
          : `Task · ${esc(todoListName(item.listId))}${item.dueDate < today ? " · Overdue" : ""}`}${item.assignee ? ` · ${esc(item.assignee)}` : ""}</span>
      </span>
      ${item.assignee ? `<span class="assignee-badge" style="background:${memberColor(item.assignee)}">${esc(item.assignee)}</span>` : ""}
    </div>`).join("");
  feed.querySelectorAll("[data-today-id]").forEach(cb => {
    cb.addEventListener("change", () => handleTodayCheck(cb.dataset.todayId, cb.dataset.todayKind, cb.checked));
  });
  updateFocusSectionLabel();
}

async function handleTodayCheck(id, kind, done) {
  const who = auth.currentUser?.displayName?.split(" ")[0] || "";
  try {
    const col = kind === "task" ? "todos" : "chores";
    await updateDoc(doc(db, col, id), { done, completedAt: done ? serverTimestamp() : null, completedBy: done ? who : "" });
  } catch (e) { console.error(e); showNotice("Couldn't update that item.", "error"); }
}

/* ── EVENTS ── */
function renderEventColorPicker(selected) {
  const picker = document.getElementById("ev-color-picker");
  picker.innerHTML = EVENT_COLORS.map(c =>
    `<div class="color-dot ${c === selected ? "selected" : ""}" style="background:${c}" data-color="${c}" title="${c}" role="button" tabindex="0" aria-label="Color ${c}"></div>`
  ).join("");
  picker.querySelectorAll(".color-dot").forEach(dot => dot.addEventListener("click", () => {
    selectedEventColor = dot.dataset.color;
    picker.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
    dot.classList.add("selected");
  }));
}

function renderEventMemberCheckboxes(selected = []) {
  const container = document.getElementById("ev-members");
  if (!members.length) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:0.82rem;font-style:italic">Add members first (Family Settings)</span>';
    return;
  }
  container.innerHTML = members.map(m => `
    <label class="event-member-label ${selected.includes(m) ? "checked" : ""}">
      <input type="checkbox" value="${esc(m)}" ${selected.includes(m) ? "checked" : ""}/>
      ${esc(m)}
    </label>`).join("");
  container.querySelectorAll("label").forEach(label => {
    label.querySelector("input").addEventListener("change", e => {
      label.classList.toggle("checked", e.target.checked);
    });
  });
}

function openEventModal(id) {
  editingEventId = id || null;
  const ev = id ? events.find(e => e.id === id) : null;
  document.getElementById("event-modal-title").textContent = ev ? "Edit Event" : "Add Event";
  document.getElementById("ev-delete-btn").style.display = ev ? "inline-flex" : "none";
  document.getElementById("ev-title").value = ev?.title || "";
  document.getElementById("ev-date").value = ev?.date || todayStr();
  document.getElementById("ev-time").value = ev?.time || "";
  document.getElementById("ev-location").value = ev?.location || "";
  document.getElementById("ev-notes").value = ev?.notes || "";
  selectedEventColor = ev?.color || EVENT_COLORS[0];
  renderEventColorPicker(selectedEventColor);
  renderEventMemberCheckboxes(ev?.who || []);
  openModal("event-modal");
}

async function saveEvent() {
  const title = document.getElementById("ev-title").value.trim();
  const date = document.getElementById("ev-date").value;
  if (!title || !date) { showNotice("Please add a title and date.", "error"); return; }
  const who = normalizeMemberList([...document.querySelectorAll("#ev-members input:checked")].map(cb => cb.value));
  const data = {
    title, date,
    time: document.getElementById("ev-time").value || null,
    location: document.getElementById("ev-location").value.trim() || null,
    notes: document.getElementById("ev-notes").value.trim() || null,
    color: selectedEventColor,
    who,
    updatedAt: serverTimestamp(),
  };
  try {
    let docRef;
    if (editingEventId) await updateDoc(doc(db, "events", editingEventId), data);
    else docRef = await addDoc(collection(db, "events"), { ...data, createdAt: serverTimestamp() });

    const syncToGcal = document.getElementById("ev-sync-gcal").checked;
    if (syncToGcal) {
      showNotice("Saving to Google Calendar…", "info");
      const gcalId = await addToGoogleCalendar(data);
      if (gcalId) {
        const fbDocId = editingEventId || docRef.id;
        await updateDoc(doc(db, "events", fbDocId), { gcalEventId: gcalId });
        showNotice("Event saved to Google Calendar! ✓", "success");
      } else {
        showNotice("Saved locally — couldn't reach Google Calendar.", "error");
      }
    } else {
      showNotice("Event saved.", "success");
    }
    closeModal("event-modal");
  } catch (e) { console.error(e); showNotice("Couldn't save that event.", "error"); }
}

async function deleteEvent() {
  if (!editingEventId) return;
  if (!await confirmDialog("Delete this event?", { confirmText: "Delete", danger: true })) return;
  try {
    const ev = events.find(e => e.id === editingEventId);
    if (ev?.gcalEventId) await deleteFromGoogleCalendar(ev.gcalEventId);
    await deleteDoc(doc(db, "events", editingEventId));
    closeModal("event-modal"); showNotice("Event deleted.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't delete that event.", "error"); }
}

async function deleteEventById(id) {
  if (!await confirmDialog("Remove this event?", { confirmText: "Remove", danger: true })) return;
  try {
    const ev = events.find(e => e.id === id);
    if (ev?.gcalEventId) await deleteFromGoogleCalendar(ev.gcalEventId);
    await deleteDoc(doc(db, "events", id)); showNotice("Event removed.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't remove that event.", "error"); }
}

/* ── TO-DO ── */
function buildTaskRows(tasks) {
  if (!tasks.length) {
    return `<div class="todo-list-empty">${todoFilter === "done" ? "No completed tasks here." : "No active tasks in this list."}</div>`;
  }
  return tasks.map(t => {
    const doneMeta = t.done && t.completedAt
      ? (() => {
        const d = t.completedAt.seconds ? new Date(t.completedAt.seconds * 1000) : new Date(t.completedAt);
        return isNaN(d) ? "" : `Done ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${t.completedBy ? ` by ${t.completedBy}` : ""}`;
      })() : "";
    const dueLabel = !t.done && t.dueDate ? dateLabel(t.dueDate) : "";
    const dueClass = !t.done && t.dueDate ? dateClass(t.dueDate) : "";
    return `<div class="check-row ${t.done ? "done" : ""}">
      <input type="checkbox" class="custom-check" ${t.done ? "checked" : ""} data-toggle-todo="${t.id}" aria-label="Mark ${esc(t.text)} ${t.done ? "incomplete" : "complete"}"/>
      <button type="button" class="todo-task-main" data-edit-todo="${t.id}" title="Edit task">
        <span class="check-label">${esc(t.text)}
          ${doneMeta ? `<span class="check-meta">${esc(doneMeta)}</span>` : ""}
          ${t.assignee ? `<span class="check-meta">${esc(t.assignee)}</span>` : ""}
        </span>
        ${dueLabel ? `<span class="due-chip ${dueClass}">${esc(dueLabel)}</span>` : ""}
      </button>
      ${t.assignee ? `<span class="assignee-badge" style="background:${memberColor(t.assignee)}">${esc(t.assignee)}</span>` : ""}
      <button type="button" class="row-remove" data-delete-todo="${t.id}" title="Delete task" aria-label="Delete task ${esc(t.text)}">✕</button>
    </div>`;
  }).join("");
}

// Visible to the WHOLE To-Do tab (passes filter, before parent-vs-kid split).
function getVisibleTodos() {
  return todos.filter(t => {
    if (todoFilter === "active" && t.done) return false;
    if (todoFilter === "done" && !t.done) return false;
    if (todoAssigneeFilter && t.assignee !== todoAssigneeFilter) return false;
    return true;
  }).map(t => ({ ...t, listId: normalizedTodoListId(t.listId) }));
}

// Subset shown in the parent board — excludes anything assigned to a kid stack.
function getParentBoardTodos() {
  return getVisibleTodos().filter(t => !isKidStackAssignee(t.assignee));
}

// Subset for a specific kid stack.
function getKidStackTodos(assigneeName) {
  return getVisibleTodos()
    .filter(t => normalizeMemberName(t.assignee) === assigneeName)
    .sort((a, b) => {
      if (!a.done && !b.done) {
        const ad = a.dueDate || "9999", bd = b.dueDate || "9999";
        if (ad !== bd) return ad < bd ? -1 : 1;
      }
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
}

function sortedTasksForList(visible, listId) {
  return visible.filter(t => t.listId === listId).sort((a, b) => {
    if (!a.done && !b.done) {
      const ad = a.dueDate || "9999", bd = b.dueDate || "9999";
      if (ad !== bd) return ad < bd ? -1 : 1;
    }
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
}

function renderTodoSummary() {
  const bar = document.getElementById("todo-summary-bar");
  if (!bar) return;
  const visible = getVisibleTodos();
  const activeCount = visible.filter(t => !t.done).length;
  const datedCount = visible.filter(t => !!t.dueDate).length;
  const kidCount = visible.filter(t => isKidStackAssignee(t.assignee)).length;
  const filterCopy = todoAssigneeFilter ? `Filtered to ${todoAssigneeFilter}` : "All assignees";
  bar.innerHTML = [
    `<span class="planner-summary-pill"><strong>${activeCount}</strong> ${activeCount === 1 ? "active task" : "active tasks"}</span>`,
    `<span class="planner-summary-pill"><strong>${datedCount}</strong> scheduled</span>`,
    `<span class="planner-summary-pill"><strong>${kidCount}</strong> for kids</span>`,
    `<span class="planner-summary-pill muted">${esc(filterCopy)}</span>`,
  ].join("");
}

function syncTodoViewControls() {
  const showFamily = todoView !== "kids";
  const showKids = todoView !== "family";
  const familyLabel = document.getElementById("todo-family-label");
  const familyPanel = document.getElementById("todo-list-panel");
  const kidsLabel = document.getElementById("todo-kids-label");
  const kidsPanel = document.getElementById("kid-stack-panel");

  if (familyLabel) familyLabel.style.display = showFamily ? "inline-block" : "none";
  if (familyPanel) familyPanel.style.display = showFamily ? "grid" : "none";
  if (kidsLabel) kidsLabel.style.display = showKids ? "inline-block" : "none";
  if (kidsPanel) kidsPanel.style.display = showKids ? "grid" : "none";

  document.querySelectorAll("#todo-view-toggle .seg-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.taskView === todoView);
  });
}

function renderTodoList() {
  const panel = document.getElementById("todo-list-panel");
  const lists = normalizedTodoLists();
  renderTodoSummary();
  syncTodoViewControls();
  // Parent board excludes anything assigned to a kid stack — those render
  // in their own section below via renderKidStacks().
  const visible = getParentBoardTodos();
  // Always keep the kid stacks in sync with the same data + filter state.
  renderKidStacks();

  if (!lists.length) { panel.innerHTML = '<div class="empty-msg">No lists yet.</div>'; return; }

  const existingCards = [...panel.querySelectorAll("[data-list-card]")].map(c => c.dataset.listCard);
  const newOrder = lists.map(l => l.id);
  const canUpdateInPlace = existingCards.length === lists.length && existingCards.join(",") === newOrder.join(",");

  if (canUpdateInPlace) {
    lists.forEach(list => {
      const card = panel.querySelector(`[data-list-card="${CSS.escape(list.id)}"]`);
      if (!card) return;
      const collapsed = isTodoListCollapsed(list.id);
      const tasks = sortedTasksForList(visible, list.id);
      const activeTasks = tasks.filter(t => !t.done).length;
      const meta = card.querySelector(".todo-list-meta");
      if (meta) meta.textContent = collapsed && activeTasks > 0
        ? `${activeTasks} active`
        : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
      const body = card.querySelector(".todo-list-body");
      if (body) body.innerHTML = buildTaskRows(tasks);
    });
    attachTodoListeners(panel);
    return;
  }

  panel.innerHTML = lists.map(list => {
    const collapsed = isTodoListCollapsed(list.id);
    const tasks = sortedTasksForList(visible, list.id);
    const activeTasks = tasks.filter(t => !t.done).length;
    const badgeText = collapsed && activeTasks > 0
      ? `${activeTasks} active`
      : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
    return `<div class="todo-list-card" draggable="true" data-list-card="${esc(list.id)}">
      <div class="todo-list-head">
        <button type="button" class="todo-list-summary" data-list-toggle="${esc(list.id)}" aria-expanded="${collapsed ? "false" : "true"}">
          <div>
            <div class="todo-list-name">${esc(list.name || "General")}</div>
            <div class="todo-list-meta">${badgeText}</div>
          </div>
          <span class="todo-list-caret" aria-hidden="true">${collapsed ? "▸" : "▾"}</span>
        </button>
        <div class="todo-list-controls">
          <button type="button" class="todo-list-drag" data-list-drag="${esc(list.id)}" title="Drag to reorder" aria-label="Drag to reorder list ${esc(list.name || "")}">⋮⋮</button>
          ${list.id === DEFAULT_TODO_LIST_ID ? "" : `<button type="button" class="todo-list-del" data-list-delete="${esc(list.id)}" title="Delete list" aria-label="Delete list ${esc(list.name || "")}">✕</button>`}
        </div>
      </div>
      <div class="todo-list-body" ${collapsed ? 'hidden style="height:0"' : ""}>${buildTaskRows(tasks)}</div>
    </div>`;
  }).join("");

  attachTodoListeners(panel);
}

function attachTodoListeners(panel) {
  panel.querySelectorAll("[data-toggle-todo]").forEach(cb => cb.addEventListener("change", () => toggleTodo(cb.dataset.toggleTodo, cb.checked)));
  panel.querySelectorAll("[data-edit-todo]").forEach(btn => btn.addEventListener("click", () => openTodoModal(btn.dataset.editTodo)));
  panel.querySelectorAll("[data-delete-todo]").forEach(btn => btn.addEventListener("click", () => deleteTodo(btn.dataset.deleteTodo)));
  panel.querySelectorAll("[data-list-toggle]").forEach(btn => btn.addEventListener("click", () => toggleTodoListCollapsed(btn.dataset.listToggle)));
  panel.querySelectorAll("[data-list-delete]").forEach(btn => btn.addEventListener("click", () => deleteTodoList(btn.dataset.listDelete)));
  panel.querySelectorAll("[data-list-drag]").forEach(handle => {
    handle.addEventListener("mousedown", e => e.stopPropagation());
    handle.addEventListener("click", e => e.preventDefault());
  });
  panel.querySelectorAll("[data-list-card]").forEach(card => {
    const listId = card.dataset.listCard;
    card.addEventListener("dragstart", e => {
      draggingTodoListId = listId;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", listId);
    });
    card.addEventListener("dragend", () => { draggingTodoListId = null; card.classList.remove("dragging"); clearTodoListDropTargets(); });
    card.addEventListener("dragover", e => {
      if (!draggingTodoListId || draggingTodoListId === listId) return;
      e.preventDefault(); clearTodoListDropTargets(); card.classList.add("drop-target");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drop-target"));
    card.addEventListener("drop", async e => {
      e.preventDefault();
      const draggedId = draggingTodoListId || e.dataTransfer.getData("text/plain");
      clearTodoListDropTargets();
      if (!draggedId || draggedId === listId) return;
      await moveTodoList(draggedId, listId);
    });
  });
}

// ─────────────────────────────────────────────
//  KID STACKS — bottom section of the To-Do tab
//  Four cards (Liam, Livi, Spencer, Any kid). Collapsed state is persisted
//  in the same Set used for parent-defined lists so the storage stays one
//  source of truth.
// ─────────────────────────────────────────────
function renderKidStacks() {
  const panel = document.getElementById("kid-stack-panel");
  if (!panel) return;

  panel.innerHTML = KID_STACK_ASSIGNEES.map(name => {
    const tasks = getKidStackTodos(name);
    const stackKey = kidStackCollapseKey(name);
    const collapsed = isTodoListCollapsed(stackKey);
    const activeCount = tasks.filter(t => !t.done).length;
    const badge = collapsed && activeCount > 0
      ? `${activeCount} active`
      : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
    const emoji = KID_STACK_EMOJI[name] || "👧";
    const label = KID_STACK_LABEL[name] || name;
    const bodyHTML = tasks.length
      ? buildTaskRows(tasks)
      : `<div class="kid-stack-empty">${todoFilter === "done" ? "Nothing completed yet." : "No active tasks."}</div>`;
    return `<div class="kid-stack-card kid-stack-${esc(name)}" data-kid-stack="${esc(stackKey)}">
      <div class="kid-stack-head">
        <button type="button" class="kid-stack-summary" data-kid-stack-toggle="${esc(stackKey)}" aria-expanded="${collapsed ? "false" : "true"}">
          <span class="kid-stack-emoji" aria-hidden="true">${emoji}</span>
          <div class="kid-stack-meta-wrap">
            <div class="kid-stack-name">${esc(label)}</div>
            <div class="kid-stack-meta">${badge}</div>
          </div>
          <span class="kid-stack-caret" aria-hidden="true">${collapsed ? "▸" : "▾"}</span>
        </button>
      </div>
      <div class="kid-stack-body" ${collapsed ? "hidden" : ""}>${bodyHTML}</div>
    </div>`;
  }).join("");

  attachKidStackListeners(panel);
}

function attachKidStackListeners(panel) {
  panel.querySelectorAll("[data-toggle-todo]").forEach(cb =>
    cb.addEventListener("change", () => toggleTodo(cb.dataset.toggleTodo, cb.checked)));
  panel.querySelectorAll("[data-edit-todo]").forEach(btn =>
    btn.addEventListener("click", () => openTodoModal(btn.dataset.editTodo)));
  panel.querySelectorAll("[data-delete-todo]").forEach(btn =>
    btn.addEventListener("click", () => deleteTodo(btn.dataset.deleteTodo)));
  panel.querySelectorAll("[data-kid-stack-toggle]").forEach(btn =>
    btn.addEventListener("click", () => toggleKidStackCollapsed(btn.dataset.kidStackToggle)));
}

function toggleKidStackCollapsed(stackKey) {
  const id = normalizedTodoListId(stackKey);
  if (collapsedTodoLists.has(id)) collapsedTodoLists.delete(id);
  else collapsedTodoLists.add(id);
  persistCollapsedTodoLists();
  renderKidStacks();
}

function setTodoView(view) {
  if (!["family", "kids", "all"].includes(view)) return;
  todoView = view;
  saveTodoView(view);
  renderTodoList();
}

async function addTodo() {
  const input = document.getElementById("todo-input");
  const text = input.value.trim();
  if (!text) return;
  const dueDate = document.getElementById("todo-due").value || null;
  const assignee = normalizeMemberName(document.getElementById("todo-assignee").value);
  try {
    await addDoc(collection(db, "todos"), {
      listId: DEFAULT_TODO_LIST_ID, text, assignee,
      dueDate, done: false, createdAt: serverTimestamp(),
    });
    lastAssignee = assignee || lastAssignee; saveLastAssignee(lastAssignee);
    input.value = ""; document.getElementById("todo-due").value = "";
    showNotice("Task added.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't add that task.", "error"); }
}

async function toggleTodo(id, done) {
  const who = auth.currentUser?.displayName?.split(" ")[0] || "";
  try { await updateDoc(doc(db, "todos", id), { done, completedAt: done ? serverTimestamp() : null, completedBy: done ? who : "" }); }
  catch (e) { console.error(e); showNotice("Couldn't update that task.", "error"); }
}

async function deleteTodo(id) {
  if (!await confirmDialog("Delete this task?", { confirmText: "Delete", danger: true })) return;
  try { await deleteDoc(doc(db, "todos", id)); showNotice("Task deleted.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't delete that task.", "error"); }
}

function setTodoFilter(filter, btn) {
  todoFilter = filter;
  document.querySelectorAll("#todo-filter-bar .filter-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  renderTodoList();
}

function setTodoAssigneeFilter(v) { todoAssigneeFilter = normalizeMemberName(v); renderTodoList(); }

/* ── CHORES ── */
function renderChoreSummary() {
  const bar = document.getElementById("chore-summary-bar");
  if (!bar) return;
  const todayIndex = new Date().getDay();
  const todayName = DAYS[todayIndex];
  const visible = chores.filter(c => !choreAssigneeFilter || c.assignee === choreAssigneeFilter);
  const todayCount = visible.filter(c => c.day === todayName).length;
  const openCount = visible.filter(c => !c.done && (c.day === todayName || isOverdueChore(c, todayIndex))).length;
  const overdueCount = visible.filter(c => isOverdueChore(c, todayIndex)).length;
  const filterCopy = choreAssigneeFilter ? `Filtered to ${choreAssigneeFilter}` : "Whole family";
  bar.innerHTML = [
    `<span class="planner-summary-pill"><strong>${todayCount}</strong> due today</span>`,
    `<span class="planner-summary-pill"><strong>${openCount}</strong> still open</span>`,
    `<span class="planner-summary-pill"><strong>${overdueCount}</strong> overdue</span>`,
    `<span class="planner-summary-pill muted">${esc(filterCopy)}</span>`,
  ].join("");
}

function renderChoreList() {
  const container = document.getElementById("chore-list-container");
  renderChoreSummary();
  const visible = chores.filter(c => !choreAssigneeFilter || c.assignee === choreAssigneeFilter);
  if (!visible.length) { container.innerHTML = '<div class="empty-msg">No chores match this filter.</div>'; return; }

  const byDay = {}; DAYS.forEach(d => { byDay[d] = []; });
  visible.forEach(c => { if (byDay[c.day]) byDay[c.day].push(c); });

  container.innerHTML = DAYS.filter(d => byDay[d].length).map(d => `
    <div class="panel" style="margin-bottom:0.75rem">
      <div class="chore-day-head">${d}</div>
      ${byDay[d].map(c => {
        const doneMeta = c.done && c.completedAt
          ? (() => {
            const dt = c.completedAt.seconds ? new Date(c.completedAt.seconds * 1000) : new Date(c.completedAt);
            return isNaN(dt) ? "" : `Done ${dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${c.completedBy ? ` by ${c.completedBy}` : ""}`;
          })() : "";
        return `<div class="check-row ${c.done ? "done" : ""}">
          <input type="checkbox" class="custom-check" ${c.done ? "checked" : ""} data-toggle-chore="${c.id}" aria-label="Mark ${esc(c.name)} ${c.done ? "incomplete" : "complete"}"/>
          <span class="check-label">${esc(c.name)}
            ${doneMeta ? `<span class="check-meta">${esc(doneMeta)}</span>` : ""}
            ${c.assignee ? `<span class="check-meta">${esc(c.assignee)}</span>` : ""}
          </span>
          ${c.assignee ? `<span class="assignee-badge" style="background:${memberColor(c.assignee)}">${esc(c.assignee)}</span>` : ""}
          <button type="button" class="row-remove" data-edit-chore="${c.id}" title="Edit chore" aria-label="Edit ${esc(c.name)}" style="font-size:0.85rem">✏️</button>
          <button type="button" class="row-remove" data-delete-chore="${c.id}" title="Delete chore" aria-label="Delete ${esc(c.name)}">✕</button>
        </div>`;
      }).join("")}
    </div>`).join("");

  container.querySelectorAll("[data-toggle-chore]").forEach(cb => cb.addEventListener("change", () => toggleChore(cb.dataset.toggleChore, cb.checked)));
  container.querySelectorAll("[data-edit-chore]").forEach(btn => btn.addEventListener("click", () => openChoreModal(btn.dataset.editChore)));
  container.querySelectorAll("[data-delete-chore]").forEach(btn => btn.addEventListener("click", () => deleteChoreById(btn.dataset.deleteChore)));
}

async function toggleChore(id, done) {
  const who = auth.currentUser?.displayName?.split(" ")[0] || "";
  try { await updateDoc(doc(db, "chores", id), { done, completedAt: done ? serverTimestamp() : null, completedBy: done ? who : "" }); }
  catch (e) { console.error(e); showNotice("Couldn't update that chore.", "error"); }
}

function setChoreAssigneeFilter(v) { choreAssigneeFilter = normalizeMemberName(v); renderChoreList(); }

function openChoreModal(id) {
  editingChoreId = id || null;
  const c = id ? chores.find(x => x.id === id) : null;
  document.getElementById("chore-modal-title").textContent = c ? "Edit Chore" : "Add Chore";
  document.getElementById("chore-delete-btn").style.display = c ? "inline-flex" : "none";
  document.getElementById("c-name").value = c?.name || "";
  document.getElementById("c-assignee").value = normalizeMemberName(c?.assignee || "");
  document.getElementById("c-day").value = c?.day || DAYS[new Date().getDay()];
  document.getElementById("c-points").value = c?.points ?? 0;
  openModal("chore-modal");
}

async function saveChore() {
  const name = document.getElementById("c-name").value.trim();
  if (!name) { showNotice("Please enter a chore name.", "error"); return; }
  const points = Math.max(0, parseInt(document.getElementById("c-points").value, 10) || 0);
  const cur = editingChoreId ? chores.find(x => x.id === editingChoreId) : null;
  const data = {
    name,
    assignee: normalizeMemberName(document.getElementById("c-assignee").value),
    day: document.getElementById("c-day").value,
    points,
    done: cur?.done || false,
    completedAt: cur?.completedAt || null,
    completedBy: cur?.completedBy || "",
  };
  try {
    if (editingChoreId) await updateDoc(doc(db, "chores", editingChoreId), data);
    else await addDoc(collection(db, "chores"), data);
    closeModal("chore-modal"); showNotice("Chore saved.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't save that chore.", "error"); }
}

async function deleteChore() {
  if (!editingChoreId) return;
  if (!await confirmDialog("Delete this chore?", { confirmText: "Delete", danger: true })) return;
  try { await deleteDoc(doc(db, "chores", editingChoreId)); closeModal("chore-modal"); showNotice("Chore deleted.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't delete that chore.", "error"); }
}

async function deleteChoreById(id) {
  if (!await confirmDialog("Delete this chore?", { confirmText: "Delete", danger: true })) return;
  try { await deleteDoc(doc(db, "chores", id)); showNotice("Chore deleted.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't delete that chore.", "error"); }
}

function showResetConfirm() { document.getElementById("reset-confirm").classList.add("show"); }
function hideResetConfirm() { document.getElementById("reset-confirm").classList.remove("show"); }

async function resetWeeklyChores() {
  hideResetConfirm();
  try {
    await Promise.all(chores.map(c => updateDoc(doc(db, "chores", c.id), { done: false, completedAt: null, completedBy: "" })));
    showNotice("Chores reset for the week.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't reset chores.", "error"); }
}

/* ── POINTS & REWARDS ── */
function renderRewardsCatalog() {
  const list = document.getElementById("rewards-catalog-list");
  if (!list) return;
  const active = rewards.filter(r => !r.archived);
  if (!active.length) { list.innerHTML = `<div class="empty-msg" style="padding:0.4rem 0">No rewards yet — add one below.</div>`; return; }
  list.innerHTML = active.map(r => `
    <div style="display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0;border-bottom:1px solid var(--border-light)">
      <span style="flex:1;font-size:0.85rem;font-weight:600">${esc(r.name)}</span>
      <span style="font-size:0.82rem;font-weight:700;color:var(--accent)">${r.cost} pts</span>
      <button data-reward-del="${esc(r.id)}" aria-label="Remove reward ${esc(r.name)}" style="background:none;border:none;cursor:pointer;color:var(--border);font-size:0.82rem;padding:0.15rem;border-radius:4px;transition:color 0.12s">✕</button>
    </div>`).join("");
  list.querySelectorAll("[data-reward-del]").forEach(btn =>
    btn.addEventListener("click", () => deleteReward(btn.dataset.rewardDel)));
}

async function addReward() {
  const nameInput = document.getElementById("reward-name-input");
  const costInput = document.getElementById("reward-cost-input");
  const name = nameInput.value.trim();
  const cost = Math.max(1, parseInt(costInput.value, 10) || 1);
  if (!name) { showNotice("Enter a reward name.", "error"); return; }
  try {
    await addDoc(collection(db, "rewards"), { name, cost, archived: false, createdAt: serverTimestamp() });
    nameInput.value = ""; costInput.value = "";
    showNotice("Reward added.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't add reward.", "error"); }
}

async function deleteReward(id) {
  try { await updateDoc(doc(db, "rewards", id), { archived: true }); showNotice("Reward removed.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't remove reward.", "error"); }
}

function renderPendingRedemptions() {
  const list = document.getElementById("pending-redemptions-list");
  if (!list) return;
  const pending = [];
  Object.entries(kidPointsData).forEach(([kidName, data]) => {
    (data.pendingRedemptions || []).forEach((r, idx) => pending.push({ kidName, idx, ...r }));
  });
  if (!pending.length) { list.innerHTML = `<div class="empty-msg" style="padding:0.4rem 0">No pending requests.</div>`; return; }
  list.innerHTML = pending.map(r => `
    <div style="display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0;border-bottom:1px solid var(--border-light)">
      <span style="font-size:0.9rem">🎁</span>
      <div style="flex:1">
        <div style="font-size:0.85rem;font-weight:600">${esc(r.name)}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${esc(r.kidName)} · ${r.cost} pts</div>
      </div>
      <button class="btn-primary btn-sm" data-redeem-approve="${esc(r.kidName)}" data-redeem-idx="${r.idx}">Approve</button>
      <button class="btn-secondary btn-sm" data-redeem-deny="${esc(r.kidName)}" data-redeem-idx="${r.idx}">Deny</button>
    </div>`).join("");
  list.querySelectorAll("[data-redeem-approve]").forEach(btn =>
    btn.addEventListener("click", () => approveRedemption(btn.dataset.redeemApprove, Number(btn.dataset.redeemIdx))));
  list.querySelectorAll("[data-redeem-deny]").forEach(btn =>
    btn.addEventListener("click", () => denyRedemption(btn.dataset.redeemDeny, Number(btn.dataset.redeemIdx))));
}

async function approveRedemption(kidName, idx) {
  try {
    const ref = doc(db, "kidPoints", kidName);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const pending = [...(data.pendingRedemptions || [])];
    const item = pending.splice(idx, 1)[0];
    const redeemed = [...(data.redeemed || []), { ...item, date: todayStr(), approvedAt: Date.now() }];
    await setDoc(ref, { ...data, pendingRedemptions: pending, redeemed }, { merge: true });
    showNotice(`Approved: ${item.name} for ${kidName}.`, "success");
  } catch (e) { console.error(e); showNotice("Couldn't approve.", "error"); }
}

async function denyRedemption(kidName, idx) {
  try {
    const ref = doc(db, "kidPoints", kidName);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const pending = [...(data.pendingRedemptions || [])];
    const item = pending.splice(idx, 1)[0];
    await setDoc(ref, { ...data, pendingRedemptions: pending }, { merge: true });
    showNotice(`Denied: ${item.name} for ${kidName}.`, "info");
  } catch (e) { console.error(e); showNotice("Couldn't deny.", "error"); }
}

/* ── MEMBERS ── */
function renderMembers() {
  const list = document.getElementById("member-list");
  if (!members.length) { list.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;font-style:italic">No members yet.</span>'; return; }
  list.innerHTML = members.map((m, i) => `
    <span class="member-badge" style="background:${MEMBER_COLORS[i % MEMBER_COLORS.length]}">
      ${esc(m)}<button type="button" data-remove="${i}" title="Remove member" aria-label="Remove ${esc(m)}">✕</button>
    </span>`).join("");
  list.querySelectorAll("[data-remove]").forEach(btn => btn.addEventListener("click", () => removeMember(Number(btn.dataset.remove))));
}

function renderAssigneeDropdowns() {
  const kidOption = '<option value="Kids">👦 Any Kid</option>';
  const opts = '<option value="">Anyone</option>' + members.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("") + kidOption;
  ["todo-assignee", "c-assignee", "todo-m-assignee"].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = normalizeMemberName(el.value);
    el.innerHTML = opts;
    // Inline add row defaults to the last-used assignee for sticky entry.
    el.value = cur || (id === "todo-assignee" ? lastAssignee : "");
  });
  const fopts = '<option value="">All people</option>' + members.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("") + kidOption;
  ["todo-filter-assignee", "chore-filter-assignee"].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = normalizeMemberName(el.value); el.innerHTML = fopts; el.value = cur;
  });
}

function renderTodoListDropdowns() {
  const opts = normalizedTodoLists().map(l => `<option value="${esc(l.id)}">${esc(l.name || "General")}</option>`).join("");
  const el = document.getElementById("todo-m-list");
  if (el) {
    const cur = el.value || DEFAULT_TODO_LIST_ID;
    el.innerHTML = opts;
    el.value = normalizedTodoListId(cur);
  }
}

async function addMember() {
  const input = document.getElementById("member-input");
  const name = normalizeMemberName(input.value);
  if (!name) return;
  if (members.includes(name)) { showNotice("That name is already added.", "error"); return; }
  try { await setDoc(doc(db, "settings", "members"), { list: [...members, name] }); input.value = ""; showNotice("Member added.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't save that member.", "error"); }
}

async function removeMember(index) {
  if (!await confirmDialog(`Remove ${members[index]} from the family list?`, { confirmText: "Remove", danger: true })) return;
  try { await setDoc(doc(db, "settings", "members"), { list: members.filter((_, i) => i !== index) }); showNotice("Member removed.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't remove that member.", "error"); }
}

/* ── Keyboard / click-outside ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && activeModalId) closeModal(activeModalId);
});
["chore-modal", "event-modal", "todo-modal", "quick-add-modal", "todo-list-modal"].forEach(id =>
  document.getElementById(id).addEventListener("mousedown", e => { if (e.target === document.getElementById(id)) closeModal(id); })
);

/* ── Expose to window ── */
window.switchTab = switchTab;
window.openSettingsPanel = openSettingsPanel;
window.closeSettingsPanel = closeSettingsPanel;
window.showResetConfirm = showResetConfirm;
window.hideResetConfirm = hideResetConfirm;
window.addReward = addReward;
window.addTodo = addTodo;
window.setTodoView = setTodoView;
window.setTodoFilter = setTodoFilter;
window.setTodoAssigneeFilter = setTodoAssigneeFilter;
window.addMember = addMember;
window.openChoreModal = openChoreModal;
window.closeChoreModal = () => closeModal("chore-modal");
window.saveChore = saveChore;
window.deleteChore = deleteChore;
window.resetWeeklyChores = resetWeeklyChores;
window.setChoreAssigneeFilter = setChoreAssigneeFilter;
window.openEventModal = openEventModal;
window.closeEventModal = () => closeModal("event-modal");
window.saveEvent = saveEvent;
window.deleteEvent = deleteEvent;
window.openQuickAddModal = openQuickAddModal;
window.closeQuickAddModal = closeQuickAddModal;
window.quickAddSelect = quickAddSelect;
window.openTodoModal = openTodoModal;
window.closeTodoModal = closeTodoModal;
window.saveTodoFromModal = saveTodoFromModal;
window.deleteTodoFromModal = deleteTodoFromModal;
window.openTodoListModal = openTodoListModal;
window.closeTodoListModal = closeTodoListModal;
window.saveTodoList = saveTodoList;

window.signOut = async () => {
  clearListeners();
  document.getElementById("mobile-nav").style.display = "none";
  await runSignOut();
};

watchAuthState(user => {
  if (user) {
    document.getElementById("app").style.display = "block";
    document.getElementById("mobile-nav").style.display = "";
    document.getElementById("user-name").textContent = user.displayName?.split(" ")[0] || "Friend";
    const photo = document.getElementById("user-photo");
    photo.src = user.photoURL || "";
    photo.alt = user.displayName ? `${user.displayName} avatar` : "";
    photo.style.display = user.photoURL ? "block" : "none";
    setTimeout(initTokenClient, 1000);
    startListening();
    openInitialTabFromQuery();
  } else {
    clearListeners();
    window.location.replace("login.html?return=productivity.html");
  }
});
