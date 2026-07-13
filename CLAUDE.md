# Family Hub

A private family dashboard that pulls meals, planning, kids' tasks, routines,
and shared info into one site. Runs on a kitchen tablet — big touch targets,
playful and bright. **The app is named simply "Family"** (renamed from
"Busick Family" on 2026-07-12 so it matches the sibling apps and carries no
last name if it ever goes public — see Current focus).

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

- **2026-07-12 — UI/UX polish pass (scheduled task, autonomous run), local
  commit only (not deployed).** The app was already fully rebuilt and live
  (see the DEPLOYED entry below — this run happened after that deploy).
  Found a chunk of uncommitted polish work already sitting in the working
  tree from an interrupted earlier session; reviewed it, verified it in
  the browser (Chrome preview, light + dark stub, desktop + mobile
  viewports via the same temporary auth-stub technique used by earlier
  runs — added then fully removed, `grep -rn PREVIEW_STUB src/` is
  clean), fixed a bug it introduced, then committed it. Front end only —
  no Firestore schema or Auth changes.

  **What was in the uncommitted work (front end only):**
  - **Planner's Calendar tab rebuilt as a native month-grid view**
    (`CalendarTab.jsx`), replacing the embedded Google Calendar iframe.
    The iframe was Google's white-background embed that didn't adapt to
    dark mode or narrow screens well. The new grid reads from the same
    `EventsContext` Meals/Today already use, tapping a day opens the
    existing event modal (prefilled with that date), and event chips
    tap through to edit. The event modal's "Also add to the family
    Google Calendar" push-to-Google option is untouched — this only
    replaced the *viewing* surface, not the Google Calendar integration
    itself (`src/lib/gcal.js`).
  - **Screen-time bonus-time bug fix** (`ScreenTimeContext.jsx`,
    `screenTime.js`): the parent "+5/+10 min" buttons used to subtract
    from `usedMsToday`, which got silently clamped at 0 — so if a kid
    hadn't used much time yet, granting more time could do nothing.
    Bonus minutes are now tracked as their own same-day field
    (`bonusMsToday`/`bonusDate`) added on top of the daily budget, so a
    grant always works and a daily reset no longer wipes it out.
  - **Recipes tag filter** (`RecipesTab.jsx`) changed from a wrapping
    row of chip buttons to a `<select>` dropdown — the chips wrapped
    awkwardly with more than a few tags on narrow screens.
  - Mobile fixes: dashboard kid cards now sit in a real grid instead of
    `flex-wrap` (which let them overlap at some widths), the mobile
    bottom dock's sizing was tightened, and `overflow-x: hidden` was
    added in a few spots to stop content from ever pushing the page
    wider than the viewport.
  - Removed `src/components/ComingSoon.jsx` — dead code left over from
    before Meals/Planner/Kids were ported off the placeholder.

  **Bug I found and fixed while verifying that work:** the new native
  calendars used a "bleed past the page padding to the screen edge" trick
  on mobile (negative margins). But their scroll-container ancestor
  (`.page-scroll`, shared by Planner/Meals) needs `overflow-x: hidden` for
  unrelated reasons (stopping other content from widening the page), and
  CSS won't let one axis truly bleed (`visible`) while the other scrolls
  (`auto`) on the same box — the browser silently upgrades the "visible"
  axis to `auto`, which still clips. The bleed rule was cutting ~18px off
  the right edge of both calendars (the Saturday column and the "Event"/
  add button were partly hidden on a real phone-width viewport). Fixed by
  dropping the edge-to-edge bleed and keeping both calendars inset within
  the normal page padding on mobile instead — simpler, and sidesteps the
  CSS limitation entirely. Re-verified clean at 375px and desktop widths
  after the fix.

  **Security pass:** `firestore.rules` reviewed — still a sound
  email-allowlist model with a default-deny catch-all, unchanged this
  run. No hardcoded secrets in `src/` (the Firebase `apiKey` in
  `src/firebase.js` is the public web config key, not a secret — the
  real access boundary is Firestore rules). `npm audit` reports 0
  vulnerabilities.

  **Not deployed** — local commit only, per the standing instruction not
  to deploy without the owner's go-ahead. Next deploy should carry this
  commit plus a real-device check of the new Planner calendar and the
  screen-time bonus fix (neither could be exercised against real
  Firestore data in the sandbox).

  **Next:** no other planned work queued — the redesign is complete and
  deployed, and this run's polish pass is committed. A future run should
  do another UI/UX/security sweep per the scheduled-task brief, or wait
  for the owner's next request.

- **2026-07-12 — DEPLOYED (owner-directed). The React rebuild is now LIVE**
  at https://busick-recipes.web.app (hosting-only deploy; Firestore rules
  and Auth untouched). This is the first production cutover from the old
  static site to the React app — the family tablet will pick it up on next
  load (may need the PWA closed/reopened once or twice for the service
  worker to update). **Still needs owner QA on a real device:** Google
  sign-in + real family data, which couldn't be exercised in the sandbox.
  (Same session also deployed the sibling apps: Accomplish hosting-only at
  tyler-busick-22.web.app, and Budget's first-ever deploy — site + Firestore
  rules — at busick-budget.web.app after linking its `.firebaserc`.)

- **2026-07-12 — Renamed to "Family" + new app icon (owner-directed, live
  session). Front end only — no Firestore/Auth/Functions changes.** Two
  owner requests handled together:
  - **Rename "Busick Family" → "Family"** everywhere user-facing, so the
    app matches the sibling apps' one-word names and carries no last name
    if it ever goes public: the sign-in heading, the sidebar wordmark
    (`src/app/Brand.jsx`), the browser tab `<title>` + `apple-mobile-web-
    app-title` + meta description (`index.html`), the PWA manifest
    `name`/`short_name` (`vite.config.js`), `package.json` description, the
    two Google-calendar iframe titles (`CalendarTab.jsx`), and the two CSS
    file-header comments. Verified in-browser: sign-in now reads "Family",
    tab title is "Family".
  - **New app icon** — a friendly house that matches the app's warm palette
    AND structurally matches the two sibling apps' icons (rounded-square
    badge + gradient glyph). Set up the same icon pipeline Accomplish/Budget
    use: a source `public/favicon.svg` + `scripts/generate-icons.mjs` +
    `npm run icons` (added `sharp` as a dev dependency) → generates
    `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`.
    `index.html` + the manifest now point at these (old `icons/icon-192`/
    `icon-512` PNGs no longer referenced — left in `public/icons/` for now,
    safe to delete later). This resolves the long-standing "PWA icons still
    reuse the old PNGs" follow-up.
  - **Sibling icons refreshed too** (owner asked for a consistent set — done
    as their own commits in their own repos, since Accomplish/Budget are
    separate git repos): **Accomplish** icon is now a bold check mark (was a
    circle+underline that read like a search glyph); **Budget** icon is now
    a clear dollar sign (was a budget-gauge ring). Same badge style/gradients
    as before, just clearer glyphs. Regenerated each app's PNGs via its own
    `npm run icons`. Note: Budget's `$` needed the gradient switched to
    `gradientUnits="userSpaceOnUse"` — a plain vertical `<line>` has a
    zero-width bounding box, so the default object-bbox gradient painted
    nothing and the bar vanished (icon read as just "S" until fixed).

  **Owner's answers to the previously-logged "Questions for Tyler"** (so the
  next run doesn't re-ask — all confirmed "keep as-is" except the icons):
  1. Kids row actions (tap-to-edit + "✕ → Really?" instead of the old ⋮
     menu) — **keep the new pattern.**
  2. Day-filter / admin chips using the shared accent instead of each kid's
     color — **leave as-is.**
  3. No kid-facing "redeem a reward" button — **intentional gap, keep it.**
  4. Simplified shared completion animation (vs. the three bespoke
     per-kid physics animations) — **keep the simpler shared version.**
  5. Light-default theme + bigger touch targets/radii — **fine as-is.**
  6. No dedicated Settings page — **fine as-is.**
  7. PWA icons — **owner wanted fresh icons; done (see above).**

  **Questions for Tyler (new):**
  - **The Firebase project id `busick-recipes` is baked into the shipped
    `src/firebase.js` config and can't be renamed** without creating a brand-
    new Firebase project and migrating all family data — out of scope and
    risky, so left untouched. It's the one place the "Busick" name still
    appears in shipped code. Also left as-is for the same
    migration-compatibility reason: the three `busick-family.*` localStorage
    keys in `src/features/planner/plannerUtils.js` (internal device-pref
    keys, never shown to any user; they intentionally match the old static
    app so the tablet's saved view/collapse state carries over). If a truly
    public, no-surname deployment ever matters, both are follow-ups to weigh
    then — flagging, not acting.

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
