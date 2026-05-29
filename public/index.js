import { signOut as runSignOut, watchAuthState, db } from "./shared-firebase.js";
import {
  collection, doc, onSnapshot, setDoc, serverTimestamp, addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  DAYS, KIDS, MOVIE_TURN_ORDER, DOG_FEED_TURN_ORDER, KID_DEFAULT_STATUS,
  esc, todayStr, greeting, formatTime,
  normalizeMemberList, normalizeAssignment, resolveTurnIndex,
  bindPageNotice, showNotice, wireAccountMenu, installErrorReporter,
} from "./shared-utils.js";

bindPageNotice();
wireAccountMenu();
installErrorReporter(db, addDoc, collection, serverTimestamp);

const state = {
  members: [], meals: {}, todos: [], chores: [], events: [],
  grocery: { items: [] },
  movieTurnIndex: 0, dogFeedTurnIndex: 0,
};
let listening = [];

function currentMoviePicker() { return MOVIE_TURN_ORDER[state.movieTurnIndex] || MOVIE_TURN_ORDER[0]; }
function currentDogFeeder() { return DOG_FEED_TURN_ORDER[state.dogFeedTurnIndex] || DOG_FEED_TURN_ORDER[0]; }

function renderTodayCalendar(key) {
  const feed = document.getElementById("today-calendar-feed");
  const todayEvents = state.events
    .filter(event => event.date === key)
    .sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  if (!todayEvents.length) {
    feed.innerHTML = `<div class="empty-msg" style="padding:0.75rem 0.25rem">Nothing on the calendar today.</div>`;
    return;
  }
  feed.innerHTML = todayEvents.map(event => `
    <div class="today-calendar-row">
      <div class="today-calendar-dot" style="background:${esc(event.color || "#C2642A")}"></div>
      <div class="today-calendar-time">${esc(formatTime(event.time))}</div>
      <div class="today-calendar-info">
        <div class="today-calendar-title">${esc(event.title)}</div>
        ${Array.isArray(event.who) && event.who.length ? `<div class="today-calendar-meta">${event.who.map(esc).join(", ")}</div>` : ""}
        ${event.location ? `<div class="today-calendar-meta">📍 ${esc(event.location)}</div>` : ""}
      </div>
    </div>
  `).join("");
}

function renderDashboard() {
  const key = todayStr();
  const todayMeal = state.meals[key];
  const dayName = DAYS[new Date().getDay()];
  const openTasks = state.todos.filter(t => !t.done && t.dueDate === key);
  const choresToday = state.chores.filter(c => c.day === dayName);
  const openChores = choresToday.filter(c => !c.done);
  const groceryItems = Array.isArray(state.grocery.items) ? state.grocery.items : [];
  const checkedCount = groceryItems.filter(i => i.checked).length;
  const groceryPct = groceryItems.length ? Math.round((checkedCount / groceryItems.length) * 100) : 0;

  document.getElementById("hero-eyebrow").textContent =
    new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  document.getElementById("today-greeting").textContent = greeting();
  const total = openTasks.length + openChores.length;
  document.getElementById("today-sub").textContent = total
    ? `${total} thing${total !== 1 ? "s" : ""} still need${total === 1 ? "s" : ""} attention today.`
    : "You're all caught up. Nice work! 🎉";

  const dinnerEl = document.getElementById("dinner-name");
  if (todayMeal) {
    dinnerEl.textContent = todayMeal.recipeName;
    dinnerEl.classList.remove("empty");
  } else {
    dinnerEl.textContent = "Nothing planned";
    dinnerEl.classList.add("empty");
  }

  document.getElementById("stat-tasks").textContent = openTasks.length;
  document.getElementById("stat-tasks-copy").textContent = openTasks.length
    ? (openTasks[0].text.slice(0, 26) + (openTasks[0].text.length > 26 ? "…" : ""))
    : "All clear!";
  document.getElementById("stat-chores").textContent = openChores.length;
  document.getElementById("stat-chores-copy").textContent = openChores.length
    ? `${choresToday.length - openChores.length} of ${choresToday.length} done`
    : choresToday.length ? "All done ✓" : "None due";
  document.getElementById("stat-grocery").textContent = groceryItems.length ? `${checkedCount}/${groceryItems.length}` : "–";
  document.getElementById("grocery-bar").style.width = `${groceryPct}%`;

  renderTodayCalendar(key);

  KIDS.forEach(name => {
    const kidChores = choresToday.filter(c => c.assignee === name);
    const kidDone = kidChores.filter(c => c.done).length;
    const dueTodayTasks = state.todos
      .filter(t => !t.done && t.assignee === name && t.dueDate === key)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const statusEl = document.getElementById(`kid-status-${name}`);
    const tasksEl = document.getElementById(`kid-tasks-${name}`);
    if (statusEl) {
      if (kidChores.length) {
        statusEl.textContent = kidDone === kidChores.length ? "All done ✓" : `${kidDone}/${kidChores.length} chores`;
        statusEl.style.color = kidDone === kidChores.length ? "var(--accent)" : "var(--text-muted)";
      } else {
        statusEl.textContent = KID_DEFAULT_STATUS[name] || "";
        statusEl.style.color = "var(--text-muted)";
      }
    }
    if (tasksEl) {
      if (!dueTodayTasks.length) { tasksEl.innerHTML = ""; return; }
      const visibleTasks = dueTodayTasks.slice(0, 3);
      const extraCount = dueTodayTasks.length - visibleTasks.length;
      tasksEl.innerHTML = [
        ...visibleTasks.map(task => `<div class="kid-card-task">${esc(task.text)}</div>`),
        extraCount > 0 ? `<div class="kid-card-task-more">+${extraCount} more</div>` : "",
      ].join("");
    }
    // Aria label summarizing the card for screen readers.
    const card = document.querySelector(`a.kid-card[href*="${name}"]`);
    if (card) {
      const status = statusEl?.textContent || "";
      const taskCount = dueTodayTasks.length;
      card.setAttribute(
        "aria-label",
        `${name}. ${status}. ${taskCount} ${taskCount === 1 ? "task" : "tasks"} due today.`
      );
    }
  });

  renderTurns();
}

function renderTurns() {
  document.getElementById("movie-turn-current").textContent = currentMoviePicker();
  document.getElementById("dog-turn-current").textContent = currentDogFeeder();
}

let movieConfirmPending = false;
let dogConfirmPending = false;

function handleMovieTurnClick() {
  if (movieConfirmPending) return;
  const current = currentMoviePicker();
  const nextIndex = (state.movieTurnIndex + 1) % MOVIE_TURN_ORDER.length;
  const next = MOVIE_TURN_ORDER[nextIndex];
  const label = current === "Parents" ? "Parents' turn" : `${current}'s turn`;
  document.getElementById("movie-confirm-label").textContent = `Mark ${label} done → ${next}?`;
  document.getElementById("movie-confirm").classList.add("show");
  movieConfirmPending = true;
}
function cancelMovieTurn() {
  document.getElementById("movie-confirm").classList.remove("show");
  movieConfirmPending = false;
}
async function confirmMovieTurn() {
  cancelMovieTurn();
  const nextIndex = (state.movieTurnIndex + 1) % MOVIE_TURN_ORDER.length;
  const next = MOVIE_TURN_ORDER[nextIndex];
  const auth = getAuth();
  const who = auth.currentUser?.displayName?.split(" ")[0] || "Family";
  try {
    await setDoc(doc(db, "settings", "movieTurn"), {
      currentIndex: nextIndex, order: MOVIE_TURN_ORDER,
      updatedAt: serverTimestamp(), updatedBy: who,
    }, { merge: true });
    showNotice(`Movie turn moved to ${next}.`, "success");
  } catch (e) { console.error(e); showNotice("Couldn't update movie turn.", "error"); }
}

function handleDogTurnClick() {
  if (dogConfirmPending) return;
  const current = currentDogFeeder();
  const nextIndex = (state.dogFeedTurnIndex + 1) % DOG_FEED_TURN_ORDER.length;
  const next = DOG_FEED_TURN_ORDER[nextIndex];
  document.getElementById("dog-confirm-label").textContent = `Mark ${current}'s feeding done → ${next}?`;
  document.getElementById("dog-confirm").classList.add("show");
  dogConfirmPending = true;
}
function cancelDogTurn() {
  document.getElementById("dog-confirm").classList.remove("show");
  dogConfirmPending = false;
}
async function confirmDogTurn() {
  cancelDogTurn();
  const nextIndex = (state.dogFeedTurnIndex + 1) % DOG_FEED_TURN_ORDER.length;
  const next = DOG_FEED_TURN_ORDER[nextIndex];
  const auth = getAuth();
  const who = auth.currentUser?.displayName?.split(" ")[0] || "Family";
  try {
    await setDoc(doc(db, "settings", "dogFeedTurn"), {
      currentIndex: nextIndex, order: DOG_FEED_TURN_ORDER,
      updatedAt: serverTimestamp(), updatedBy: who,
    }, { merge: true });
    showNotice(`Dog-feeding turn moved to ${next}.`, "success");
  } catch (e) { console.error(e); showNotice("Couldn't update dog-feeding turn.", "error"); }
}

setInterval(() => {
  const el = document.getElementById("today-greeting");
  if (el) el.textContent = greeting();
}, 60 * 1000);

function clearListeners() { listening.forEach(s => s()); listening = []; }

function startListening() {
  clearListeners();
  listening.push(
    onSnapshot(doc(db, "settings", "members"), snap => {
      state.members = normalizeMemberList((snap.exists() && snap.data().list) || []);
      renderDashboard();
    }),
    onSnapshot(collection(db, "meals"), snap => {
      state.meals = {};
      snap.docs.forEach(d => { state.meals[d.id] = d.data(); });
      renderDashboard();
    }),
    onSnapshot(collection(db, "todos"), snap => {
      state.todos = snap.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() }));
      renderDashboard();
    }),
    onSnapshot(collection(db, "chores"), snap => {
      state.chores = snap.docs.map(d => normalizeAssignment({ id: d.id, ...d.data() }));
      renderDashboard();
    }),
    onSnapshot(collection(db, "events"), snap => {
      state.events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderDashboard();
    }),
    onSnapshot(doc(db, "grocery", "current"), snap => {
      state.grocery = snap.exists() ? snap.data() : { items: [] };
      renderDashboard();
    }),
    onSnapshot(doc(db, "settings", "movieTurn"), snap => {
      state.movieTurnIndex = resolveTurnIndex(snap.exists() ? snap.data() : null, MOVIE_TURN_ORDER);
      renderDashboard();
    }),
    onSnapshot(doc(db, "settings", "dogFeedTurn"), snap => {
      state.dogFeedTurnIndex = resolveTurnIndex(snap.exists() ? snap.data() : null, DOG_FEED_TURN_ORDER);
      renderDashboard();
    }),
  );
}

window.signOut = async () => {
  clearListeners();
  document.getElementById("mobile-nav").style.display = "none";
  await runSignOut();
};
window.handleMovieTurnClick = handleMovieTurnClick;
window.cancelMovieTurn = cancelMovieTurn;
window.confirmMovieTurn = confirmMovieTurn;
window.handleDogTurnClick = handleDogTurnClick;
window.cancelDogTurn = cancelDogTurn;
window.confirmDogTurn = confirmDogTurn;

watchAuthState(user => {
  if (user) {
    document.getElementById("app").style.display = "block";
    document.getElementById("mobile-nav").style.display = "";
    document.getElementById("user-name").textContent = user.displayName?.split(" ")[0] || "Friend";
    const photo = document.getElementById("user-photo");
    photo.src = user.photoURL || "";
    photo.alt = user.displayName ? `${user.displayName} avatar` : "";
    photo.style.display = user.photoURL ? "block" : "none";
    startListening();
  } else {
    clearListeners();
    window.location.replace("login.html?return=index.html");
  }
});
