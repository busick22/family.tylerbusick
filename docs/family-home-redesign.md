# Family home redesign

## Direction and isolation

Owner requested a fresh redesign on September 5, 2026: reduce confusion,
prioritize first-time understanding, reconsider the whole app, and preserve
previous versions. No additional preference questions were needed.

- Branch: `codex/family-home-redesign`.
- Starting branch: `codex/planning-first-redesign` at `f210c7b`.
- Checkpoint `6ebfe56` preserves all review fixes that were already uncommitted
  when work began. Neither the old branch ref nor `main` was advanced.
- Hosting preview channel: `family-home` in `busick-recipes`.
- Preview: https://busick-recipes--family-home-tzhi5rls.web.app
- Deploy with `npm run deploy:preview` from a clean, committed tree. This
  branch's script targets only `family-home`, runs lint/tests/build, and uses
  `--no-authorized-domains` because the Auth project differs from Hosting.
- The previous `planning-first` preview and production are separate channels.
  Do not publish this redesign to production without an owner request.

## Audit and decisions

The old navigation put Week and Calendar beside each other as separate top-level
places, even though both describe the same family schedule. To-dos required
navigating several filters, groceries lived inside Meals, and the main landing
page immediately asked the user to operate a weekly planning workspace.
Parent management had a separate, vaguely labeled Parent destination. Meal
planning opened a persistent editor even before a person chose to edit dinner.

The new organizing principle is five familiar places with a stable Home:

| Place | Purpose |
| --- | --- |
| Home | Capture a thought; see today's plans, due work, dinner, groceries and kids |
| Plan | One calendar with Week and Month views, retaining the selected date |
| Lists | Shared to-dos and groceries, including existing named lists and chores |
| Meals | A weekly dinner menu and recipe book |
| Kids | Each child's checklist, screen time, wish lists, rewards and history |

A persistent desktop/tablet rail names each place. Phones use the same five
names in a fixed bottom dock. Family settings is consistently available in
the rail or phone header. A Help guide is available from the rail and account
menu and links to real destinations.

## What changed

- Home has immediate one-line to-do capture. It needs no person or date,
  writes to the existing General list, and retains the input if saving fails.
  The same capture control appears in Lists and respects the selected list
  and person. Saving switches out of a completed/repeating/search view so the
  new item is visible.
- Add something is available everywhere, with plain-language choices for a
  to-do, event, grocery item or dinner. Existing editors handle the writes.
- Home uses a bounded daily agenda and due-work list, plus direct dinner,
  grocery and kid shortcuts. Pending parent requests link to the requests
  dialog. Turn rotation is available under Whose turn is it and in settings.
- Plan combines week and month under one navigation item. Week and month
  changes persist in the URL. Calendar overflow still opens a readable day
  sheet. Redundant cross-feature links were removed from the week overview.
- Lists exposes To-dos and Groceries side by side. Capture and the main work
  views are visible; search/person/list filters and maintenance use disclosure.
  Existing assignments, named lists, weekly chores, point awards and undo
  behavior remain intact.
- Meals reads as a menu, with one day per row/tile. Choosing a day opens dinner
  details. Simple write-ins, recipe choices, cooking mode, recipe editing and
  the month overview remain available. Grocery generation stays opt-in.
- Kids has named entry cards and a clear grown-up link. Personal tabs are
  My day, Wish lists, Rewards and History; All kids provides a plain back path.
  Weekly chores from earlier days no longer say Overdue on the child checklist.
- Event editing begins with title, date/time, location and people. Notes,
  colors and optional Google Calendar publishing are grouped below.
- Shared dialogs have accessible names, trap keyboard focus, support Escape,
  and restore focus to the opener. The topmost dialog handles nested focus.
- New visual language: evergreen actions, light green/white surfaces, a warm
  dinner note, quiet borders and consistent type. Existing personal kid colors
  and familiar house mark remain. Light and dark themes both work; touch
  targets retain the 48px minimum baseline. Motion is limited to feedback.
- September 6 polish removes generic subtitles, repeated helper sentences,
  decorative grid/blur treatments and redundant per-row captions. Navigation
  now relies on five plain labels, while Help keeps concise descriptions where
  a first-time user may need them. Wish-item editing is an icon in the title
  row. iOS safe-area spacing now treats the status inset and 64px top control
  row separately, protects landscape side insets and removes the extra page
  gap above the already-inset bottom dock.

## Data boundary

The preview uses real Auth and Firestore in `tyler-busick-22`, following the
owner's existing preview-data choice. Signed-in edits affect the same family
records as production. No collection migration or Firestore rules changes
were made by this redesign. Existing transactional completion and point
safeguards from the checkpoint are retained.

The exact new preview hostname was added to `tyler-busick-22`'s Auth authorized
domains. Every pre-existing authorized domain was verified preserved. No
wildcard domains, users, credentials, or other Auth settings were changed.

Browser write tests used `demo-family-wishes` only, via the existing local
Auth/Firestore emulator wiring. `tests/emulator.css` keeps the local warning
visible without obscuring the phone navigation; its dynamic import is gated
by Vite DEV and the emulator flag and is eliminated from production builds.

## Verification

- ESLint, 8 unit tests and production build pass.
- 20 local emulator regression tests pass, including concurrent completion,
  point attribution/undo, shared-wish access and private gift tracking.
- Browser checks at 1194×834, 1024×768, 390×844 and 375×812 cover navigation, light/dark
  layouts, quick capture, chore completion and undo, event creation, simple
  dinner saving, grocery addition, kids, settings and wish-list navigation.
- Empty Home and child checklist states were inspected after the emulator
  suite cleared its sample data. Sample fixtures were then restored locally.
- Month navigation to October, switching to Week, dialog Shift-Tab trapping,
  Escape dismissal and focus restoration were exercised.

Real Google sign-in and installed-PWA behavior on the family's physical tablet
still need an owner check. Automated browser checks used emulator sign-in.

## Published release

- App code revision: `0083df6` (pushed to origin).
- Preview release: `1788635566198000`.
- Expires October 5, 2026 at 2:12 p.m. America/Chicago
  (`2026-10-05T19:12:42.436637190Z`).
- Served HTML and all eight referenced assets match the production build
  byte-for-byte. The hosted sign-in page opens successfully.
- Live release `1788392907305000` and prior preview release
  `1788399600838000` were verified unchanged after publication.
- Working branch is backed up at
  https://github.com/busick22/family.tylerbusick/tree/codex/family-home-redesign
