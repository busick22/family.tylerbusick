# Planning-first redesign

## Owner direction — September 2, 2026

- Primary device: landscape iPad. Portrait phone use remains essential.
- The family primarily uses the app to PLAN and ORGANIZE, not as an ambient
  display. Prioritize finding, creating, assigning, editing, and reviewing
  plans. A shared daily board is a supporting view, not the assumed center
  of the redesign.
- Reduce competing destinations and inconsistent task/chores/points behavior.
- Preserve existing family data and the current wish-list capabilities.
- Work on this branch and preview; do not publish the redesign to production
  without a separate owner request.

## Branch and preview

- Branch: `codex/planning-first-redesign`.
- Baseline: `b6804c8` checkpoints the already-deployed wish-list work, which
  was uncommitted before the branch was created. `main` was not changed.
- Firebase Hosting project/site: `busick-recipes`.
- Preview channel: `planning-first`.
- Preview URL: https://busick-recipes--planning-first-lci3xaw5.web.app
- Initial deployment: `b69c9fb`, verified against the built HTML and main
  bundle; live Hosting release `1788392907305000` remained unchanged.
- Initial expiration: October 2, 2026 at 7:17 p.m. America/Chicago
  (`2026-10-03T00:17:19Z`).
- The owner explicitly authorized pushing this branch to
  `busick22/family.tylerbusick` on September 2, 2026.
- The initial preview matched production. The first implemented redesign
  follows below; branch/preview setup alone was not a visual redesign.
- Updates are explicit, not automatic on push: commit intended changes on
  this branch, then run `npm run deploy:preview`.
- The command checks the branch and clean working tree, runs lint/unit tests
  and a production build, then updates ONLY the preview channel. It does not
  deploy Firestore rules or the live channel.
- The channel lasts 30 days from deployment; rerun the command to publish
  another revision and extend its lifetime. Keep the URL returned by Firebase.

## Data and sign-in boundary

A Hosting preview is a separate website, NOT a separate database. The initial
app configuration still points to live Auth/Firestore in `tyler-busick-22`.
Changes made after signing into such a preview affect the same family data
as production. On September 2, 2026, the owner explicitly chose to keep using
real data and acknowledged that preview edits affect production data. Do not
create a separate test backend for the hosted preview. Continue to use local
emulators for write-heavy or destructive tests; do not run such experiments
against live data.

Hosting's automatic Auth-domain synchronization is disabled because it would
target `busick-recipes`, not the app's actual Auth project. The exact preview
hostname `busick-recipes--planning-first-lci3xaw5.web.app` was added to
`tyler-busick-22` and verified, preserving every existing authorized domain.
No Firestore rules or family records were changed. End-to-end Google sign-in
still needs an owner check. Do not add wildcard domains or change existing
allowed domains.

Local emulator testing remains available as described in `wish-lists.md` and
does not access production family data.

## First implemented pass — September 2, 2026

- Week replaces the passive Home dashboard: landscape iPad has a week overview
  beside an editable selected day; portrait phones use a compact date strip.
- Direct navigation: Week / Calendar / To-dos / Meals / Kids. Parent management
  has a consistent header entry instead of living inside the child selector.
- Tasks and weekly chores share one searchable, filterable To-dos destination
  and editor. Named lists, assignment, optional dates, points, and weekly reset
  remain available. Legacy `/planner` links redirect here.
- Completion and undo now use one atomic transaction for task/chore state and
  point history. Repeated/concurrent taps do not duplicate awards. Parents
  completing shared, point-bearing work can choose which child earned it.
- Meal planning opens in a week-and-detail layout, with the month overview
  still available. Dinner can be a recipe or a simple write-in plan. Groceries
  have an always-visible add form; adding missing meal ingredients preserves
  manual items, amounts, and checked items. It does not merge quantities.
- Kids open directly into My day: one checklist with optional extras, a smaller
  idle timer, and separate Wish lists / Points & rewards / History tabs.
  Undated tasks are visible; child quick-add assigns today's date.
- Phone calendar days open a readable day sheet instead of clipping event
  names inside narrow cells. Theme controls work in the shared header.
- PWA orientation is now `any`, allowing landscape iPad and portrait phone.

### Scope boundaries

No Firestore schema, rules, Auth behavior, or production records were migrated.
Wish-list sharing and private gift tracking remain unchanged. The hosted
preview still uses real family data. Test fixtures are confined to local
emulators (`tests/seed-planning.mjs`); never deploy or run them against live data.

Weekly chores retain the existing manual-reset lifecycle; automatic recurring
instances and full Google Calendar synchronization are not part of this pass.
Older inactive page components remain in the repository for reference but are
not reachable from the new route table.

### Verification

Published code revision: `c65de90`. Preview release: `1788399600838000`.
The served HTML and `/assets/index-C_5d9yqW.js` matched the local production
build byte-for-byte. Live release `1788392907305000` and its previous bundle
were verified unchanged. Preview expires October 2, 2026 at 8:39 p.m.
America/Chicago. All 7 unit tests and 20 emulator checks passed.

- `npm test`: date boundaries, combined task grouping, undated task visibility,
  safe grocery append, and wish-list validation.
- `npm run test:rules`: wish-list privacy plus transactional completion/undo,
  concurrent taps, shared-work attribution, unauthorized access, deleted items.
  If the local emulator is already running, run the two `*.rules.test.js`
  files directly with `node --test` instead of starting a second emulator.
- Browser checks use local Auth/Firestore emulators with sample data at landscape
  iPad and portrait phone widths. Write-in dinner, grocery add/merge, task
  creation, child visibility, completion/undo, and calendar day sheets exercised.
- Real-device Google sign-in, installed-PWA safe areas/orientation, and planning
  with the family's actual data still need the owner's preview check.

## Review follow-up — September 2, 2026

A review of the first pass produced the fixes below. Front end plus one
config change; no Firestore schema, rules, Auth, or production records were
touched, and the scope boundaries above still hold.

### Correctness

- Completion stays transactional, but the UI is now optimistic. A transaction
  always round-trips to the server, unlike an ordinary write, so every
  checkbox previously waited on the network before it ticked. Rows now update
  and celebrate immediately and roll back only on a real failure.
- All `kidPoints` mutations run in transactions and write only the array they
  own. Reading the document and writing it back whole meant a redemption
  approval could discard points awarded a moment earlier by a completed
  chore. Entries are matched by `ts`/`requestedAt` rather than a rendered
  array index.
- `deleteWork` removes a kid's completed task and takes back its points in
  one transaction. Parent deletion still keeps history deliberately.
- Weekly chores past their day group under "Earlier this week" instead of
  "Overdue", which previously mixed them with genuinely missed one-time
  tasks every week.
- The Week day detail uses `WorkRow`, so work can be completed from the
  landing page and finished chores render as done.
- Clearing the whole grocery list offers a cancel and states there is no undo.

### Cleanup

- Removed the unreachable Dashboard/Planner pages, the desktop sidebar, and
  the old planner tabs, modals and rows, plus `plannerUtils.js`.
- Folded the `.planning-shell`-prefixed overrides of other features' CSS back
  into those features' own stylesheets. `planner.css` 749 → 255 lines,
  `shell.css` 350 → 168; total CSS 75.5 kB → 62.8 kB.
- Retired `--accent-home`/`--accent-planner`; corrected `--accent-soft` and
  `--accent-glow`, which still held the pre-redesign orange.
- Gitignored `.env.local`, which had been blocking `npm run deploy:preview`'s
  clean-tree check.
- Dropped the `firestore` block from `firebase.json` so a bare
  `firebase deploy` here cannot push the stale `busick-recipes` ruleset.

### Verification

Lint, 8 unit tests, and a production build pass. Real-data sign-in, an
installed-PWA check, and a visual pass over Kids, Meals and the calendar
after the CSS consolidation still need the owner's preview check.
