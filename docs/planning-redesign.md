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
- Branch is saved locally. Uploading it to `busick22/family.tylerbusick`
  was blocked by the safety review pending explicit owner approval to push
  source to GitHub. Do not claim it has been pushed or auto-deploys.
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
hostname `busick-recipes--planning-first-lci3xaw5.web.app` was added to
`tyler-busick-22` and verified, preserving every existing authorized domain.
No Firestore rules or family records were changed. End-to-end Google sign-in
still needs an owner check. Do not add wildcard domains or change existing
allowed domains.

Local emulator testing remains available as described in `wish-lists.md` and
does not access production family data.
