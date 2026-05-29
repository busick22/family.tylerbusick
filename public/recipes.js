import { signOut as runSignOut, watchAuthState, db } from "./shared-firebase.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  MONTHS, MONTHS_SHORT, DAYS_SHORT,
  esc, todayStr,
  bindPageNotice, showNotice, wireAccountMenu,
  confirmDialog, installErrorReporter,
} from "./shared-utils.js";

bindPageNotice();
wireAccountMenu();
installErrorReporter(db, addDoc, collection, serverTimestamp);

let recipes = [], meals = {}, aisles = {};
let editingId = null, viewingId = null, activeTag = null, formTags = [];
let calYear, calMonth, calSelectedDate, calWeekOffset = 0;
let groceryItems = [], selectedDays = new Set();
let listening = [], activeModalId = null;

const recipeGrid = document.getElementById("recipe-grid");
const tagFilterBar = document.getElementById("tag-filter-bar");

function closeModal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.remove("open");
  if (id === "cal-modal") document.getElementById("cal-recipe-dropdown").classList.remove("open");
  if (activeModalId === id) activeModalId = null;
}

function openModal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.add("open"); activeModalId = id;
  setTimeout(() => { const f = m.querySelector("input,textarea,button,select"); if (f) f.focus(); }, 40);
}

function openQuickAddModal() { openModal("quick-add-modal"); }
function closeQuickAddModal() { closeModal("quick-add-modal"); }
function quickAddSelect(type) {
  closeQuickAddModal();
  if (type === "recipe") openAddModal();
  if (type === "meal") openCalModal(todayStr());
  if (type === "grocery") openGroceryAddModal();
}

function openGroceryAddModal() {
  document.getElementById("grocery-add-name").value = "";
  document.getElementById("grocery-add-amount").value = "";
  openModal("grocery-add-modal");
}
function closeGroceryAddModal() { closeModal("grocery-add-modal"); }

async function saveGroceryAddModal() {
  const name = document.getElementById("grocery-add-name").value.trim();
  if (!name) { showNotice("Please add an item name.", "error"); return; }
  const amount = document.getElementById("grocery-add-amount").value.trim();
  groceryItems.push({
    id: `manual-${Date.now()}`, name, amount,
    aisle: getAisle(name), checked: false, manual: true, sources: [],
  });
  try {
    document.getElementById("grocery-list-section").style.display = "block";
    renderGroceryItems();
    await persistGroceryState();
    closeGroceryAddModal();
    showNotice("Grocery item added.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't save that grocery item.", "error"); }
}

function attachOverlayClose(id, fn) {
  document.getElementById(id).addEventListener("mousedown", e => { if (e.target === document.getElementById(id)) fn(); });
}

function clearListeners() { listening.forEach(s => s()); listening = []; }

function switchTab(name, btn) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  btn.classList.add("active");
  if (name === "calendar") { renderCalendar(); renderWeekList(); }
  if (name === "grocery") renderDaySelector();
}

function startListening() {
  clearListeners();
  listening.push(
    onSnapshot(collection(db, "recipes"), snap => {
      recipes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderRecipes(); renderTagFilters(); renderCalendar(); renderDaySelector();
    }),
    onSnapshot(collection(db, "meals"), snap => {
      meals = {}; snap.docs.forEach(d => { meals[d.id] = d.data(); });
      if (pruneSelectedDays()) void persistGroceryState();
      renderCalendar(); renderWeekList(); renderDaySelector();
    }),
    onSnapshot(collection(db, "aisles"), snap => {
      aisles = {}; snap.docs.forEach(d => { aisles[d.id] = d.data().aisle; });
    }),
    onSnapshot(doc(db, "grocery", "current"), snap => {
      const data = snap.exists() ? snap.data() : { items: [], selectedDays: [] };
      groceryItems = Array.isArray(data.items) ? data.items : [];
      selectedDays = new Set(Array.isArray(data.selectedDays) ? data.selectedDays : []);
      if (pruneSelectedDays()) void persistGroceryState();
      document.getElementById("grocery-list-section").style.display = groceryItems.length ? "block" : "none";
      renderDaySelector(); renderGroceryItems();
    }),
  );
}

function getRecipeById(id) { return recipes.find(r => r.id === id); }

async function persistGroceryState() {
  try {
    await setDoc(doc(db, "grocery", "current"), {
      items: groceryItems, selectedDays: [...selectedDays], updatedAt: serverTimestamp(),
    });
  } catch (e) { console.error(e); showNotice("Couldn't save the grocery list.", "error"); }
}

/* ── RECIPES ── */
function renderRecipes() {
  const q = (document.getElementById("search-input").value || "").toLowerCase().trim();
  const filtered = recipes.filter(r => {
    const hay = [r.name || "", r.notes || "", ...(r.tags || []), ...(r.ingredients || []).map(i => i.name || "")].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!activeTag || (r.tags || []).includes(activeTag));
  }).sort((a, b) => {
    if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  if (!filtered.length) {
    recipeGrid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👨‍🍳</div><p>${recipes.length ? "No recipes match your search." : "No recipes yet — add your first one!"}</p></div>`;
    return;
  }
  recipeGrid.innerHTML = filtered.map(r => {
    const last = r.lastCooked ? new Date(r.lastCooked).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    return `<button type="button" class="recipe-card interactive-card" data-recipe-id="${r.id}" aria-label="View recipe: ${esc(r.name || "")}${r.favorite ? " (family staple)" : ""}">
      <div class="recipe-card-name">${r.favorite ? "★ " : ""}${esc(r.name)}</div>
      <div class="recipe-card-meta">
        ${r.prep ? `<span>⏱ ${esc(r.prep)}</span>` : ""}
        ${r.cook ? `<span>🔥 ${esc(r.cook)}</span>` : ""}
        ${last ? `<span>Last: ${esc(last)}</span>` : ""}
      </div>
      ${(r.tags || []).length ? `<div class="recipe-card-tags">${r.tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join("")}</div>` : ""}
    </button>`;
  }).join("");
  recipeGrid.querySelectorAll("[data-recipe-id]").forEach(btn => btn.addEventListener("click", () => openViewModal(btn.dataset.recipeId)));
}

function renderTagFilters() {
  const all = [...new Set(recipes.flatMap(r => r.tags || []))].sort();
  if (!all.length) { tagFilterBar.innerHTML = ""; return; }
  tagFilterBar.innerHTML = [
    `<button type="button" class="tag-filter ${!activeTag ? "active" : ""}" data-tag="">All</button>`,
    ...all.map(t => `<button type="button" class="tag-filter ${activeTag === t ? "active" : ""}" data-tag="${esc(t)}">${esc(t)}</button>`),
  ].join("");
  tagFilterBar.querySelectorAll("[data-tag]").forEach(btn => btn.addEventListener("click", () => {
    activeTag = btn.dataset.tag || null; renderTagFilters(); renderRecipes();
  }));
}

function addIngredientRow(amount = "", name = "") {
  const row = document.createElement("div"); row.className = "ingredient-row";
  row.innerHTML = `<input class="form-input amount" placeholder="Amount" value="${esc(amount)}"/><input class="form-input ing-name" placeholder="Ingredient" value="${esc(name)}"/><button type="button" class="btn-remove-ing" aria-label="Remove ingredient">✕</button>`;
  row.querySelector(".btn-remove-ing").addEventListener("click", () => row.remove());
  document.getElementById("ingredient-list").appendChild(row);
}

function renderTagChips() {
  const area = document.getElementById("tag-input-area"), field = document.getElementById("tag-field");
  area.querySelectorAll(".tag-chip").forEach(c => c.remove());
  formTags.forEach(t => {
    const chip = document.createElement("span"); chip.className = "tag-chip";
    chip.innerHTML = `${esc(t)}<button type="button" aria-label="Remove tag ${esc(t)}">✕</button>`;
    chip.querySelector("button").addEventListener("click", () => { formTags = formTags.filter(x => x !== t); renderTagChips(); });
    area.insertBefore(chip, field);
  });
}

function handleTagKey(e) {
  if (e.key !== "Enter" && e.key !== ",") return; e.preventDefault();
  const v = e.target.value.replace(",", "").trim();
  if (v && !formTags.includes(v)) { formTags.push(v); renderTagChips(); }
  e.target.value = "";
}

function openAddModal() {
  editingId = null; formTags = [];
  document.getElementById("modal-title").textContent = "Add Recipe";
  document.getElementById("btn-delete").style.display = "none";
  ["f-name", "f-prep", "f-cook", "f-notes"].forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("f-favorite").checked = false;
  document.getElementById("ingredient-list").innerHTML = "";
  renderTagChips(); addIngredientRow(); openModal("edit-modal");
}

function openEditModal(id) {
  const r = getRecipeById(id); if (!r) return;
  editingId = id; formTags = [...(r.tags || [])];
  document.getElementById("modal-title").textContent = "Edit Recipe";
  document.getElementById("btn-delete").style.display = "block";
  document.getElementById("f-name").value = r.name || "";
  document.getElementById("f-prep").value = r.prep || "";
  document.getElementById("f-cook").value = r.cook || "";
  document.getElementById("f-notes").value = r.notes || "";
  document.getElementById("f-favorite").checked = !!r.favorite;
  const list = document.getElementById("ingredient-list"); list.innerHTML = "";
  (r.ingredients || []).forEach(i => addIngredientRow(i.amount, i.name));
  if (!(r.ingredients || []).length) addIngredientRow();
  renderTagChips(); openModal("edit-modal");
}

async function saveRecipe() {
  const name = document.getElementById("f-name").value.trim();
  if (!name) { showNotice("Please enter a recipe name.", "error"); return; }
  const ingredients = [...document.querySelectorAll(".ingredient-row")].map(row => ({
    amount: row.querySelector(".amount").value.trim(),
    name: row.querySelector(".ing-name").value.trim(),
  })).filter(i => i.name);
  const cur = editingId ? getRecipeById(editingId) || {} : {};
  const data = {
    name,
    prep: document.getElementById("f-prep").value.trim(),
    cook: document.getElementById("f-cook").value.trim(),
    notes: document.getElementById("f-notes").value.trim(),
    favorite: document.getElementById("f-favorite").checked,
    tags: [...formTags],
    ingredients,
    lastCooked: cur.lastCooked || null,
  };
  try {
    if (editingId) await updateDoc(doc(db, "recipes", editingId), data);
    else await addDoc(collection(db, "recipes"), { ...data, createdAt: serverTimestamp() });
    closeModal("edit-modal"); showNotice("Recipe saved.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't save that recipe.", "error"); }
}

async function deleteRecipe() {
  if (!editingId) return;
  if (!await confirmDialog("Delete this recipe? This can't be undone.", { confirmText: "Delete", danger: true })) return;
  try {
    await deleteDoc(doc(db, "recipes", editingId));
    closeModal("edit-modal"); showNotice("Recipe deleted.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't delete that recipe.", "error"); }
}

function buildRecipeViewHTML(r) {
  const last = r.lastCooked ? new Date(r.lastCooked).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  return `${r.favorite ? `<p style="margin-bottom:0.5rem;color:var(--accent);font-weight:700;font-size:0.85rem">★ Family staple</p>` : ""}
    <h2 class="view-recipe-name">${esc(r.name || "")}</h2>
    <div class="view-meta">
      ${r.prep ? `<div class="view-meta-item">⏱ <strong>Prep:</strong> ${esc(r.prep)}</div>` : ""}
      ${r.cook ? `<div class="view-meta-item">🔥 <strong>Cook:</strong> ${esc(r.cook)}</div>` : ""}
      ${last ? `<div class="view-meta-item">🍽 <strong>Last made:</strong> ${esc(last)}</div>` : ""}
    </div>
    ${(r.tags || []).length ? `<div class="view-tags">${r.tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join("")}</div>` : ""}
    ${(r.ingredients || []).length ? `<p class="view-section-title" style="margin-top:0.5rem">Ingredients</p><ul class="view-ingredient-list">${r.ingredients.map(i => `<li><span class="ing-amount">${esc(i.amount)}</span>${esc(i.name)}</li>`).join("")}</ul>` : ""}
    ${r.notes ? `<p class="view-section-title">Notes &amp; Instructions</p><div class="view-notes">${esc(r.notes)}</div>` : ""}`;
}

function openViewModal(id) {
  const r = getRecipeById(id); if (!r) return;
  viewingId = id;
  document.getElementById("view-modal-body").innerHTML = buildRecipeViewHTML(r);
  openModal("view-modal");
}

function editFromView() { closeModal("view-modal"); openEditModal(viewingId); }

/* ── COOK MODE ── */
function openCookMode() {
  const r = getRecipeById(viewingId); if (!r) return;
  closeModal("view-modal");
  document.getElementById("cook-title").textContent = r.name || "";
  const metas = []; if (r.prep) metas.push(`⏱ Prep: ${r.prep}`); if (r.cook) metas.push(`🔥 Cook: ${r.cook}`);
  document.getElementById("cook-meta").textContent = metas.join("  ·  ");
  const body = document.getElementById("cook-body");
  let html = "";
  if ((r.ingredients || []).length) {
    html += `<p class="cook-section-title">Ingredients</p>`;
    html += `<div id="cook-ings">${r.ingredients.map((ing, i) => `
      <div class="cook-ingredient" id="cing-${i}">
        <input type="checkbox" class="cook-check" data-cing="${i}" aria-label="Mark ${esc(ing.name)} prepared"/>
        <span class="cook-ing-amount">${esc(ing.amount)}</span>
        <span class="cook-ing-name">${esc(ing.name)}</span>
      </div>`).join("")}</div>`;
  }
  if (r.notes) { html += `<p class="cook-section-title" style="margin-top:1.25rem">Instructions</p><div class="cook-notes">${esc(r.notes)}</div>`; }
  body.innerHTML = html;
  body.querySelectorAll("[data-cing]").forEach(cb => {
    const i = cb.dataset.cing;
    cb.addEventListener("change", () => {
      const row = document.getElementById(`cing-${i}`);
      if (cb.checked) row.classList.add("checked"); else row.classList.remove("checked");
    });
    cb.closest(".cook-ingredient").addEventListener("click", e => {
      if (e.target !== cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event("change")); }
    });
  });
  openModal("cook-modal");
}

/* ── CALENDAR ── */
function initCalendar() {
  const now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); renderCalendar();
}

function renderCalendar() {
  if (calYear === undefined) { initCalendar(); return; }
  document.getElementById("cal-month-label").textContent = `${MONTHS[calMonth]} ${calYear}`;
  const today = new Date(), firstDay = new Date(calYear, calMonth, 1).getDay(),
    daysInMonth = new Date(calYear, calMonth + 1, 0).getDate(),
    daysInPrev = new Date(calYear, calMonth, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, cur: false, year: calMonth === 0 ? calYear - 1 : calYear, month: calMonth === 0 ? 11 : calMonth - 1 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true, year: calYear, month: calMonth });
  for (let d = 1; d <= 42 - cells.length; d++) cells.push({ day: d, cur: false, year: calMonth === 11 ? calYear + 1 : calYear, month: calMonth === 11 ? 0 : calMonth + 1 });
  const container = document.getElementById("cal-days");
  container.innerHTML = cells.map(c => {
    const dk = `${c.year}-${String(c.month + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
    const meal = meals[dk], isToday = c.cur && c.day === today.getDate() && c.month === today.getMonth() && c.year === today.getFullYear();
    return `<button type="button" class="cal-day ${!c.cur ? "other-month" : ""} ${isToday ? "today" : ""}" data-day-key="${dk}" aria-label="${dk}${meal ? ` — ${esc(meal.recipeName)}` : ""}">
      <div class="cal-day-num">${c.day}</div>
      ${meal ? `<div class="cal-meal-chip"><span class="cal-meal-chip-name">${esc(meal.recipeName)}</span><span class="cal-clear-btn" data-clear-day="${dk}" role="button" aria-label="Clear dinner for ${dk}">✕</span></div>` : `<div class="cal-add-hint">+ dinner</div>`}
    </button>`;
  }).join("");
  container.querySelectorAll("[data-day-key]").forEach(btn => btn.addEventListener("click", e => { if (!e.target.closest("[data-clear-day]")) openCalModal(btn.dataset.dayKey); }));
  container.querySelectorAll("[data-clear-day]").forEach(btn => btn.addEventListener("click", async e => { e.stopPropagation(); await calClearDayDirect(btn.dataset.clearDay); }));
}

function calChangeMonth(dir) {
  calMonth += dir; if (calMonth > 11) { calMonth = 0; calYear++; } if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar();
}
function calGoToday() {
  const now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); calWeekOffset = 0; renderCalendar(); renderWeekList();
}

function renderWeekList() {
  const ws = getWeekStart(calWeekOffset), we = new Date(ws); we.setDate(ws.getDate() + 6);
  document.getElementById("cal-week-label").textContent = `${MONTHS_SHORT[ws.getMonth()]} ${ws.getDate()} – ${MONTHS_SHORT[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const meal = meals[dk], isToday = d.getTime() === today.getTime();
    rows.push(`<div class="cal-week-row ${isToday ? "today" : ""}" data-week-day="${dk}">
      <span class="cal-week-dayname">${DAYS_SHORT[d.getDay()]}</span>
      <span class="cal-week-datenum">${d.getDate()}</span>
      ${meal ? `<span class="cal-week-meal">${esc(meal.recipeName)}</span><button class="cal-week-clear" data-week-clear="${dk}" aria-label="Clear dinner for ${dk}">✕</button>` : `<span class="cal-week-empty">Tap to plan dinner</span>`}
    </div>`);
  }
  const container = document.getElementById("cal-week-rows"); container.innerHTML = rows.join("");
  container.querySelectorAll("[data-week-day]").forEach(row => row.addEventListener("click", e => { if (!e.target.closest("[data-week-clear]")) openCalModal(row.dataset.weekDay); }));
  container.querySelectorAll("[data-week-clear]").forEach(btn => btn.addEventListener("click", async e => { e.stopPropagation(); await calClearDayDirect(btn.dataset.weekClear); }));
}

function getWeekStart(offset) {
  const now = new Date(), s = new Date(now); s.setDate(now.getDate() - now.getDay() + offset * 7); s.setHours(0, 0, 0, 0); return s;
}
function calWeekShift(dir) { calWeekOffset += dir; renderWeekList(); }
function calWeekGoToday() { calWeekOffset = 0; renderWeekList(); }

function openCalModal(dk) {
  calSelectedDate = dk; const meal = meals[dk];
  const [y, m, d] = dk.split("-").map(Number);
  document.getElementById("cal-modal-title").textContent = meal ? "Dinner Planned" : "Plan Dinner";
  document.getElementById("cal-modal-date").textContent = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (meal) {
    const r = getRecipeById(meal.recipeId);
    document.getElementById("cal-assigned-body").innerHTML = r ? buildRecipeViewHTML(r) : `<p><strong>${esc(meal.recipeName)}</strong></p>`;
    document.getElementById("cal-assigned-view").style.display = "block";
    document.getElementById("cal-search-view").style.display = "none";
  } else { calSwitchToSearch(); }
  openModal("cal-modal");
}

function calSwitchToSearch() {
  document.getElementById("cal-assigned-view").style.display = "none";
  document.getElementById("cal-search-view").style.display = "block";
  document.getElementById("cal-search-input").value = "";
  document.getElementById("cal-recipe-dropdown").classList.remove("open");
  document.getElementById("cal-recipe-dropdown").innerHTML = "";
  setTimeout(() => document.getElementById("cal-search-input").focus(), 50);
}

function calFilterDropdown() {
  const q = document.getElementById("cal-search-input").value.toLowerCase().trim();
  const dd = document.getElementById("cal-recipe-dropdown");
  if (!q) { dd.classList.remove("open"); dd.innerHTML = ""; return; }
  const matches = recipes.filter(r => (r.name || "").toLowerCase().includes(q)).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  dd.classList.add("open");
  dd.innerHTML = matches.length
    ? matches.map(r => `<button type="button" class="recipe-drop-item" data-pick="${r.id}">${esc(r.name || "")}</button>`).join("")
    : `<div class="recipe-drop-empty">No recipes found.</div>`;
  dd.querySelectorAll("[data-pick]").forEach(btn => btn.addEventListener("click", () => calAssignRecipe(btn.dataset.pick)));
}

async function calAssignRecipe(rid) {
  const r = getRecipeById(rid); if (!r) return;
  try {
    await Promise.all([
      setDoc(doc(db, "meals", calSelectedDate), { recipeId: rid, recipeName: r.name || "", updatedAt: serverTimestamp() }),
      updateDoc(doc(db, "recipes", rid), { lastCooked: calSelectedDate }),
    ]);
    closeModal("cal-modal"); showNotice("Dinner plan updated.", "success");
  } catch (e) { console.error(e); showNotice("Couldn't assign that recipe.", "error"); }
}

async function calClearDay() {
  try { await deleteDoc(doc(db, "meals", calSelectedDate)); closeModal("cal-modal"); showNotice("Dinner removed.", "success"); }
  catch (e) { console.error(e); showNotice("Couldn't remove that meal.", "error"); }
}

async function calClearDayDirect(dk) {
  try { await deleteDoc(doc(db, "meals", dk)); }
  catch (e) { console.error(e); showNotice("Couldn't remove that meal.", "error"); }
}

/* ── GROCERY ── */
function getAisleKey(name) { return name.toLowerCase().trim().replace(/\s+/g, "-"); }
function getAisle(name) { return aisles[getAisleKey(name)] || ""; }
async function saveAislePreference(name, aisle) {
  const k = getAisleKey(name); aisles[k] = aisle;
  return setDoc(doc(db, "aisles", k), { aisle, name });
}

function getEligibleMealKeys() {
  const today = todayStr();
  return Object.keys(meals).filter(dk => dk >= today).sort();
}

function pruneSelectedDays() {
  const allowed = new Set(getEligibleMealKeys());
  const next = [...selectedDays].filter(dk => allowed.has(dk));
  const changed = next.length !== selectedDays.size;
  if (changed) selectedDays = new Set(next);
  return changed;
}

function renderDaySelector() {
  const keys = getEligibleMealKeys();
  const container = document.getElementById("day-selector");
  if (!keys.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;font-style:italic">No meals planned for today or later yet. Add some on the Calendar tab!</p>';
    return;
  }
  container.innerHTML = keys.map(dk => {
    const meal = meals[dk]; const [y, m, d] = dk.split("-").map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return `<button type="button" class="day-chip ${selectedDays.has(dk) ? "selected" : ""}" data-grocery-day="${dk}">
      <span>${label}</span><span class="day-recipe">${esc(meal.recipeName)}</span>
    </button>`;
  }).join("");
  container.querySelectorAll("[data-grocery-day]").forEach(btn => btn.addEventListener("click", () => toggleDay(btn.dataset.groceryDay)));
}

async function toggleDay(dk) { if (selectedDays.has(dk)) selectedDays.delete(dk); else selectedDays.add(dk); renderDaySelector(); await persistGroceryState(); }
async function selectAllDays() { getEligibleMealKeys().forEach(dk => selectedDays.add(dk)); renderDaySelector(); await persistGroceryState(); }
async function clearDaySelection() { selectedDays.clear(); renderDaySelector(); await persistGroceryState(); }

async function buildGroceryList() {
  if (pruneSelectedDays()) await persistGroceryState();
  if (!selectedDays.size) { showNotice("Please select at least one day.", "error"); return; }
  const merged = {};
  selectedDays.forEach(dk => {
    const meal = meals[dk]; if (!meal) return;
    const r = getRecipeById(meal.recipeId); if (!r) return;
    (r.ingredients || []).forEach(ing => {
      if (!ing.name) return;
      const key = ing.name.toLowerCase().trim();
      if (!merged[key]) { merged[key] = { name: ing.name, amounts: [], aisle: getAisle(ing.name), checked: false, sources: [] }; }
      if (ing.amount) merged[key].amounts.push(ing.amount);
      merged[key].sources.push(r.name);
    });
  });
  groceryItems = Object.entries(merged).map(([key, item], i) => ({
    id: `ing-${i}-${key}`, name: item.name, amount: item.amounts.join(" + "),
    aisle: item.aisle, checked: false, manual: false, sources: item.sources,
  }));
  document.getElementById("grocery-list-section").style.display = "block";
  renderGroceryItems(); await persistGroceryState();
  showNotice("Grocery list built from selected meals.", "success");
}

function renderGroceryItems() {
  const container = document.getElementById("grocery-items-container");
  if (!groceryItems.length) { container.innerHTML = '<p style="color:var(--text-muted);font-style:italic;padding:0.5rem 0">Your list is empty.</p>'; updateCheckedCount(); return; }
  const groups = {};
  groceryItems.forEach(item => { const a = item.aisle || "__other"; if (!groups[a]) groups[a] = []; groups[a].push(item); });
  const sorted = Object.keys(groups).sort((a, b) => { if (a === "__other") return 1; if (b === "__other") return -1; return a.localeCompare(b); });
  container.innerHTML = sorted.map(g => `
    <div class="aisle-group">
      <div class="aisle-group-title">🏪 ${esc(g === "__other" ? "Other / Unassigned" : g)}</div>
      ${groups[g].map(item => `
        <div class="grocery-item ${item.checked ? "checked" : ""}" id="gitem-${esc(item.id)}">
          <input type="checkbox" class="grocery-check" ${item.checked ? "checked" : ""} data-toggle-item="${esc(item.id)}" aria-label="Toggle ${esc(item.name)}"/>
          <span class="grocery-item-amount">${esc(item.amount)}</span>
          <div class="grocery-item-name">
            ${esc(item.name)}
            ${item.sources?.length ? `<span class="grocery-sources">From: ${item.sources.map(esc).join(", ")}</span>` : ""}
          </div>
          <input class="grocery-aisle-input" placeholder="aisle…" value="${esc(item.aisle)}" data-aisle-item="${esc(item.id)}" title="Type aisle — saved forever!" aria-label="Aisle for ${esc(item.name)}"/>
          <button type="button" class="grocery-remove-btn" data-remove-item="${esc(item.id)}" aria-label="Remove ${esc(item.name)}">✕</button>
        </div>`).join("")}
    </div>`).join("");
  updateCheckedCount();
  container.querySelectorAll("[data-toggle-item]").forEach(cb => cb.addEventListener("change", async () => toggleCheck(cb.dataset.toggleItem)));
  container.querySelectorAll("[data-remove-item]").forEach(btn => btn.addEventListener("click", async () => removeGroceryItem(btn.dataset.removeItem)));
  container.querySelectorAll("[data-aisle-item]").forEach(inp => inp.addEventListener("change", async () => saveAisle(inp.dataset.aisleItem, inp.value)));
}

async function toggleCheck(id) { const item = groceryItems.find(x => x.id === id); if (!item) return; item.checked = !item.checked; renderGroceryItems(); await persistGroceryState(); }
async function saveAisle(id, aisle) {
  const item = groceryItems.find(x => x.id === id); if (!item) return;
  item.aisle = aisle.trim();
  try { await saveAislePreference(item.name, item.aisle); renderGroceryItems(); await persistGroceryState(); }
  catch (e) { console.error(e); }
}
async function removeGroceryItem(id) { groceryItems = groceryItems.filter(x => x.id !== id); renderGroceryItems(); await persistGroceryState(); }
async function clearChecked() { groceryItems = groceryItems.filter(x => !x.checked); renderGroceryItems(); await persistGroceryState(); }
async function clearGroceryList() {
  if (!await confirmDialog("Clear the entire grocery list?", { confirmText: "Clear list", danger: true })) return;
  groceryItems = []; selectedDays.clear();
  document.getElementById("grocery-list-section").style.display = "none";
  renderDaySelector(); await persistGroceryState();
  showNotice("Grocery list cleared.", "success");
}
async function addManualItem() {
  const n = document.getElementById("manual-item-name"), a = document.getElementById("manual-item-amount");
  const name = n.value.trim(); if (!name) return;
  groceryItems.push({ id: `manual-${Date.now()}`, name, amount: a.value.trim(), aisle: getAisle(name), checked: false, manual: true, sources: [] });
  n.value = ""; a.value = "";
  document.getElementById("grocery-list-section").style.display = "block";
  renderGroceryItems(); await persistGroceryState();
}
function updateCheckedCount() {
  const c = groceryItems.filter(x => x.checked).length, t = groceryItems.length;
  document.getElementById("checked-count").textContent = t ? `${c} of ${t} checked` : "";
  const btn = document.getElementById("clear-checked-btn"); if (btn) btn.style.display = c > 0 ? "" : "none";
}

/* ── KEYBOARD & OVERLAY ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && activeModalId) closeModal(activeModalId);
});
document.getElementById("manual-item-name").addEventListener("keydown", e => { if (e.key === "Enter") addManualItem(); });
["edit-modal", "view-modal", "cal-modal", "cook-modal", "quick-add-modal", "grocery-add-modal"].forEach(id => attachOverlayClose(id, () => closeModal(id)));

/* ── WINDOW EXPORTS ── */
window.switchTab = switchTab;
window.openAddModal = openAddModal;
window.closeEditModal = () => closeModal("edit-modal");
window.saveRecipe = saveRecipe;
window.deleteRecipe = deleteRecipe;
window.addIngredientRow = addIngredientRow;
window.handleTagKey = handleTagKey;
window.closeViewModal = () => closeModal("view-modal");
window.editFromView = editFromView;
window.openCookMode = openCookMode;
window.closeCookModal = () => closeModal("cook-modal");
window.calChangeMonth = calChangeMonth;
window.calGoToday = calGoToday;
window.calWeekShift = calWeekShift;
window.calWeekGoToday = calWeekGoToday;
window.closeCalModal = () => closeModal("cal-modal");
window.calClearDay = calClearDay;
window.calSwitchToSearch = calSwitchToSearch;
window.calFilterDropdown = calFilterDropdown;
window.buildGroceryList = buildGroceryList;
window.selectAllDays = selectAllDays;
window.clearDaySelection = clearDaySelection;
window.clearChecked = clearChecked;
window.clearGroceryList = clearGroceryList;
window.addManualItem = addManualItem;
window.openQuickAddModal = openQuickAddModal;
window.closeQuickAddModal = closeQuickAddModal;
window.quickAddSelect = quickAddSelect;
window.openGroceryAddModal = openGroceryAddModal;
window.closeGroceryAddModal = closeGroceryAddModal;
window.saveGroceryAddModal = saveGroceryAddModal;
window.renderRecipes = renderRecipes;

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
    startListening();
    if (calYear === undefined) initCalendar();
    renderWeekList();
  } else {
    clearListeners();
    window.location.replace("login.html?return=recipes.html");
  }
});
