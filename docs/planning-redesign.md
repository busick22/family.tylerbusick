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
as production. Separate test data/backend is awaiting the owner's choice;
do not assume isolation or run destructive experiments against live data.

Hosting's automatic Auth-domain synchronization is disabled because it would
target `busick-recipes`, not the app's actual Auth project. The exact preview
hostname must be authorized in the chosen Auth project before Google sign-in
can be used. Do not add wildcard domains or change existing allowed domains.

Local emulator testing remains available as described in `wish-lists.md` and
does not access production family data.
