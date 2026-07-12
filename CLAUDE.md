# Busick Family Hub

A private family dashboard that pulls meals, planning, kids' tasks, routines,
and shared info into one site. Runs on a kitchen tablet — big touch targets,
playful and bright.

- **Stack:** React 18 + Vite, React Router, Firebase, `lucide-react` icons.
  Installable PWA (`vite-plugin-pwa`). Mirrors the sibling apps' structure
  (`../accomplish`, `../budget`) — when in doubt, look at how they do it —
  but keeps its own touch-friendly, playful identity (see Design system
  below).
- **Firebase project:** `busick-recipes` (see `.firebaserc`) — unchanged
  from the old static site, so all existing data keeps working.
- **Firebase services:** Firestore (shared family data), Auth (Google
  sign-in only — the whole family shares one signed-in account on the
  tablet), Hosting.

## Data model (unchanged from the old static site — do not restructure)

Unlike Accomplish/Budget's per-user `users/{uid}/...` model, this app's
Firestore data is **shared, flat collections** gated by an email allowlist
in `firestore.rules` (`familyEmails()` / `parentEmails()`), because the
whole family uses one signed-in account on the tablet:

- `settings/members` — `{ list: string[] }`
- `settings/movieTurn`, `settings/dogFeedTurn` — turn-rotation trackers
- `grocery/current` — `{ items: [{ name, checked, ... }] }`
- `todos/{id}`, `todoLists/{id}` — one-off tasks
- `chores/{id}` — recurring, day-of-week assigned duties
- `events/{id}` — family calendar
- `kidPoints/{kidName}` — kids' point balances
- `recipes/{id}`, `meals/{dateKey}`, `aisles/{id}` — meal planning
- `rewards/{id}` — kids' rewards catalog
- `screenTime/{kidName}`, `screenTimeRequests/{id}` — kids' screen-time
- `errors/{id}` — client error log (`window.onerror` → Firestore)

Kids: `Liam` (10), `Livi` (8), `Spencer` (5) — see `src/lib/family.js`.

## Layout (React app)

- `index.html` (root) — Vite's SPA entry point (not a page — don't confuse
  with the old `public/index.html`, which is gone).
- `src/main.jsx` — mounts React, wraps every provider.
- `src/App.jsx` — auth gate + route table.
- `src/firebase.js` — the only file with the Firebase config.
- `src/state/` — one context per concern: `AuthContext` (Google sign-in),
  `SettingsContext` (theme — **localStorage only**, not per-user Firestore,
  since it's a device preference for the shared tablet), and one context per
  Firestore collection (`MembersContext`, `MealsContext`, `TodosContext`,
  `ChoresContext`, `EventsContext`, `GroceryContext`, `TurnsContext`).
- `src/lib/family.js` — shared constants (`KIDS`, turn orders, colors) and
  helpers (dates, names, turn-index math) — ported from the old
  `shared-utils.js`.
- `src/lib/errorReporter.js` — ported `window.onerror` → Firestore reporter.
- `src/app/` — the shell: `AppShell.jsx` (desktop sidebar / mobile top bar +
  floating dock, switched by CSS media query, never JS resize logic),
  `Sidebar.jsx`, `BottomNav.jsx`, `AccountMenu.jsx` (mobile-only dropdown),
  `Brand.jsx`, `nav.js` (the four areas + their accent colors).
- `src/features/<area>/` — one folder per page: `auth` (SignInPage),
  `dashboard` (built), `meals`, `planner`, `kids` (all three still
  `ComingSoon` placeholders — see below).
- `src/styles/tokens.css` + `base.css` — every color/size/timing, plus the
  shared component kit (`.btn`, `.card`, `.modal`, `.chip`, ...).
- `src/components/` — small shared pieces: `Modal.jsx`, `Notice.jsx`
  (toast), `ComingSoon.jsx`.
- `public/` — **only** true static passthrough assets now: `icons/`,
  `favicon.ico`, `images/`, `minecraftia/` (a pixel font used by the old
  kids page's Minecraft theme — still needed once Kids is ported),
  `robots.txt`, `theme-init.js` (paints the right theme before React loads).

The **old static site is gone from `public/`** (replaced by the React app
above) but fully intact in git history — `git show cae5a72:public/kids.js`
(etc.) retrieves any old page's exact old logic for reference while porting.

## Design system (shared language with Accomplish/Budget, tuned for a kids' tablet)

Same architecture as the sibling apps — `tokens.css` names every color/size/
timing once, `base.css` builds shared component classes on top, feature CSS
stays in its folder. Same font pairing (Space Grotesk display + Inter body),
same dark/light theme-switching mechanism (`data-theme` on `<html>`, painted
pre-React by `theme-init.js`). Deliberate departures for a kitchen-tablet,
kid-facing app:

- **Light theme by default** (Accomplish/Budget default dark) — reads
  bright and cheerful on a counter-mounted tablet, not like a nighttime
  dashboard. Dark theme is fully built too (toggle in the sidebar / mobile
  account menu), just not the default.
- **Bigger everything:** type scale, radii, and a `--tap: 48px` minimum
  touch-target size used throughout (buttons, icon buttons, fields, sidebar
  links) — kids tap this, nothing should be fiddly.
- **Four playful per-tab accents** instead of one brand color: Home
  (warm orange), Meals (tomato red), Planner (blue), Kids (purple) — same
  pattern as Budget's five accents, just family-appropriate hues.
- Warm brown/cream palette (vs. Accomplish's navy/cyan, Budget's forest/
  green) — closest to the old static site's terracotta identity, just
  reorganized into the token architecture.

## Commands

- `npm install` then `npm run dev` → http://localhost:5175
- `npm run lint` → check code style
- `npm run build` → produce `dist/`
- Deploy (when ready): `npm run build`, then `firebase deploy` — **not done
  yet, do not run this until the owner asks.** `firebase.json` now points
  `hosting.public` at `dist/` with SPA rewrites, mirroring Budget's CSP
  (tightened: no more `unsafe-inline` on `script-src` since the React build
  has no inline scripts, unlike the old static HTML).

## Working on it

- New pages go in `src/features/<area>/`, following `dashboard`'s pattern:
  a `<Area>Page.jsx` that reads from the relevant `state/*Context.jsx`
  hook(s), plus a co-located `<area>.css`.
- New Firestore collections need a matching `state/*Context.jsx` (copy an
  existing one — `onSnapshot`, gate on `user`, normalize on read).
- **New colors/sizes only via `tokens.css` variables** — that's what keeps
  both themes and the four page accents working everywhere.
- `firestore.rules` is untouched and should stay that way unless the data
  model genuinely changes — it's shared, tested against real family data.

## Current focus

- **2026-07-12 — React + Vite rebuild: all four pages now ported (scheduled
  task, autonomous run). Dashboard, Meals, and Planner were finished in
  earlier runs this same day; this run ported the last page, Kids
  (profiles, points/rewards, screen time), which was the biggest of the
  four (old `kids.js` was 1,527 lines). Front end only — no Firestore
  schema or Auth changes; same collections, same data shapes as the old
  static site. Lint and `npm run build` both pass. Verified in-browser
  (Chrome preview, light + dark, desktop + mobile) via the same kind of
  temporary auth stub used for earlier pages — real Firestore reads
  return `permission-denied` in that sandboxed browser (no real Google
  token), so every list renders its empty state rather than real family
  data, but that's enough to confirm every screen renders, every tab and
  modal opens/closes, and nothing crashes. **Real data + real Google
  sign-in still needs a check by the owner** via `npm run dev` locally or
  once deployed — same caveat as the Dashboard/Meals/Planner ports.

  **Kids page — what's there** (`src/features/kids/`): a "who are you?"
  selector (tap a kid's name, or a Parent tab with 4 admin tiles) leads
  into a per-kid dashboard with Today/Points/History tabs, ported 1:1 from
  the old `kids.html`/`kids.js`/`kids.css`:
  - **Today:** the screen-time countdown timer (start/pause, live
    countdown, auto-stop at zero, "ask for more time"), today's chores +
    tasks (with a day filter once a kid has chores on multiple days),
    "Everyone Extras" (collapsible, for tasks anyone can do), an all-done
    celebration state, tonight's dinner banner, and the movie-night/
    dog-feeding "whose turn" banner — all reusing the same
    Chores/Todos/Meals/Turns Firestore contexts Meals and Planner already
    built.
  - **Points:** running total, the rewards catalog (view-only for kids —
    the old app never had a kid-facing "redeem" button either, so that's
    preserved as-is, not a regression), and redemption history.
  - **History:** last two weeks of completed chores/tasks with points
    earned, missed chores a kid can still knock out, and a peek at next
    week.
  - **Parent tab** (4 tiles → modals): Members (add/remove family names),
    Screen Time (per-kid +5/+10/−10/−15 min, reset, daily budget), Points
    (per-kid balances + reset, point-value editors for tasks/chores, the
    rewards catalog), and Pending (reward-redemption + screen-time
    requests waiting on a parent).
  - New contexts: `ScreenTimeContext` (screen-time budgets/sessions +
    "more time" requests — was already built by a previous run but not
    yet wired into `main.jsx`; wired in now) and a few new methods added
    to the existing `KidPointsContext` (`awardPoints`, `revokePoints`,
    `deleteHistoryEntry`, `resetKids` — also pre-built, now used).

  **Judgment call — simplified the per-kid completion animation.** The
  old app had three fully bespoke, hand-coded particle-physics animations
  for checking off a chore/task: Minecraft blocks breaking apart for
  Liam, flower petals scattering for Livi, a TIE fighter flying past for
  Spencer (~150 lines of one-off JS+CSS per kid). I replaced this with
  one shared "themed particle pop" component (`KidItemRow.jsx`) that
  bursts a few emoji from each kid's theme (⛏️🟩💎 / 🌸🐞🌺 / ⭐🚀✨) in
  their accent color when a row is checked off. Kids still each feel
  distinct (color, emoji, tab labels, empty-state messages, all still
  ported verbatim from `KID` in the old `kids.js`), but the celebration
  itself is one simpler, reusable mechanism instead of three bespoke
  physics engines. If you want the exact old animations back, they're in
  git history at `cae5a72:public/kids.js` (search `animateLiviRow`,
  `animateSpencerRow`, `animateLiamTaskMine`).

  **Questions for Tyler** (best judgment made in each case):
  - Row actions changed from the old app's tap-and-hold "⋮" popup menu
    (edit/delete) to tap-the-row-to-edit + a small "✕ → Really?" delete
    button, matching how Planner's task/chore rows already work. Same
    capabilities, more consistent with the rest of the app, but a
    different tap pattern than the old Kids page specifically.
  - The day-filter chips and a few admin chips use the shared `.chip`
    component's default (page/global accent) rather than each kid's own
    color — a small, easy-to-tune visual inconsistency, not a functional
    one (`src/features/kids/kids.css`, search `.chip[data-active`).
  - No kid-facing "redeem a reward" button (see Points above) — carried
    over from the old app rather than added as a new feature, per this
    run's "don't add new major features" scope. Worth asking whether
    that's an intentional gap or something to build next.

  **Not done this run** (unchanged from earlier notes): no dedicated
  Settings page, no error-log viewer for parents, PWA icons still reuse
  the old `icon-192`/`icon-512` PNGs.

  **Next:** with all four pages ported, the rebuild's remaining work is
  polish, not porting — a UI/UX/security pass across the whole app (per
  the scheduled-task instructions), plus the still-open items above.

- **2026-07-12 — React + Vite rebuild started (scheduled task, autonomous
  run). Phase 1 (foundation) complete: scaffold, design system, sign-in,
  app shell, Dashboard fully ported. Meals/Planner/Kids are placeholders.
  Built + verified in-browser (with a temporary preview stub, since
  removed — `grep -rn PREVIEW_STUB src/` is clean).**

  **What changed — front end only** (no Firestore schema or Auth behavior
  changed; same project, same collections, same sign-in method):
  - Converted the whole `public/` static site to React 18 + Vite,
    matching `../accomplish` and `../budget`'s conventions (package.json
    deps/versions, `eslint.config.js`, `vite.config.js` chunking, the
    `src/state` + `src/app` + `src/features` + `src/styles` folder split,
    the `.btn`/`.card`/`.modal`/`.chip` component-class system). Old
    static HTML/JS/CSS pages removed from `public/` (still in git history
    at commit `cae5a72` for reference while porting the rest).
  - **Design system** built from scratch in the shared token architecture,
    but deliberately tuned for a kids'-tablet app rather than copied
    verbatim: light-default theme, bigger type/touch-targets/radii, four
    per-tab accent colors (Home/Meals/Planner/Kids) instead of one brand
    color. See "Design system" above for the full reasoning — this was my
    judgment call, not something the owner specified; worth a look next
    time you're in the app.
  - **Auth:** Google-only (matches the old app — the family shares one
    account on the tablet), with the same popup→redirect fallback pattern
    Budget uses for embedded browsers.
  - **Dashboard (Home)** fully ported: hero with greeting/date/tonight's
    dinner, Tasks/Routines/Groceries stat tiles, today's calendar feed,
    kid cards (emoji, chore/task status, up to 3 due-today tasks + "N
    more"), and the "Whose Turn" movie-night/dog-feeding rotation with the
    same inline-confirm interaction (tap → "Mark done → Next?" → Yes/
    Cancel) as the old page. Same Firestore reads, same derived-state
    logic, same data shapes — just React instead of manual DOM updates.
  - **Meals, Planner, Kids** are `ComingSoon` placeholders with working
    navigation/theming — not yet ported. Their old logic is substantial
    (recipes.js 608 lines, productivity.js 1323 lines, kids.js 1527
    lines) and needs the same page-by-page treatment as Dashboard.
  - Contexts already built and ready for the next pages to consume:
    `MembersContext`, `MealsContext`, `TodosContext`, `ChoresContext`,
    `EventsContext`, `GroceryContext`, `TurnsContext`. Meals will need new
    `RecipesContext` + `AislesContext`; Planner will reuse Todos/Chores/
    Events; Kids will need `KidPointsContext`, `ScreenTimeContext`,
    `ScreenTimeRequestsContext`, `RewardsContext`, and reuses Chores.
  - **Verified in-browser** (Chrome preview, both themes, both viewport
    sizes): sign-in screen renders correctly (Google-only, matches
    branding); dashboard renders real layout end-to-end when signed in —
    verified via a temporary `AuthProvider`/`DashboardPage` fixture stub
    (marked `// PREVIEW_STUB`, fully removed after — grep confirms clean,
    lint + build clean both before and after revert); confirmed: hero
    gradient + greeting/date, all three stat tiles incl. grocery progress
    bar, calendar feed with two sample events, three kid cards with
    chore/task state, movie/dog turn items including the tap-to-confirm
    flow (clicked through to the inline "Yes, move it / Cancel" state);
    desktop sidebar (expanded + collapsed) and mobile top-bar + floating
    dock nav both confirmed at real viewport sizes; dark mode toggle
    confirmed (warm dark brown, not a cold dark theme). Real sign-in
    itself (Google popup) could not be exercised in the sandboxed preview
    browser — same limitation Budget's own build notes hit ("the embedded
    pane blocks both popup AND the redirect hop"); needs a real-browser
    check by the owner once deployed or run via `npm run dev` locally.
  - `.claude/launch.json` updated (was pointing at a stale old-app path
    and `http-server`; now runs `npm run dev`).

  **Questions for Tyler** (my best judgment call was made in each case —
  flagging in case you'd choose differently):
  - Light-default theme + bigger touch targets/radii vs. matching
    Accomplish/Budget's exact sizing: I biased toward the tablet/kids use
    case per the task brief. If you'd rather it read closer to the sibling
    apps' compact desktop style, the tokens are all in one file to retune.
  - No dedicated Settings page (theme toggle + sign out live directly in
    the sidebar/account menu instead) — the old app didn't have one
    either, so I didn't add one. Fine to leave as-is unless a future page
    needs a settings home.
  - PWA icons reuse the old `icons/icon-192.png` / `icon-512.png` as-is
    (no new `favicon.svg` + `npm run icons` pipeline like Budget has,
    since there was no source SVG) — fine for now, but if you want a
    fresher app icon at some point that's a small follow-up.

  **Next (in order):** Meals/recipes page (recipes.js — recipe box, meal
  calendar assignment, grocery aisles), then Planner (productivity.js —
  calendar, tasks, chores), then Kids (kids.js — profiles, points,
  rewards, screen time, the per-kid Minecraft/Ladybug/Star Wars themes).
  Each should follow Dashboard's pattern exactly: read the old page's
  JS/HTML/CSS (or `git show cae5a72:public/<file>` if already deleted),
  build matching Firestore context(s), port the page 1:1 into the new
  design system, verify in-browser, then move to the next page. Not
  started this run: no Settings page, no dedicated error-log viewer for
  parents (the old app didn't have a UI for the `errors` collection
  either — it was Firestore-console-only).
