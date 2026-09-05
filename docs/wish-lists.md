# Wish lists

Each child has a Wish Lists tab with named lists and wishes (name, optional
store link, notes, and USD price). Parents manage lists from the same child
page; there is no combined parent dashboard and no connection to points.

Sharing is off by default. Turning it on exposes only that list's metadata
and wishes through a random Firestore document ID at `/wish-lists/:listId`.
The public view does not mount the private family-data providers. Anyone
with that link can read it; there is no public list directory and no public
editing. Turning sharing off disables existing links; turning it back on
reuses the same link. Store links suppress referrers.

Purchase details live in a separate `purchases` subcollection and are only
loaded when a parent opens Parent gift tracking. They are never included
in the public document, item documents, ordinary child UI, or public view.
The tablet shares a parent account: the Parent button hides spoilers during
ordinary use but is not an identity or PIN gate against a child using that
same login. Separate non-parent accounts cannot read purchase documents.
The owner explicitly chose this shared-account behavior without a parent
PIN on 2026-09-02.

## Data

- `wishLists/{randomId}`: `kid`, `name`, `shared`, `archived`, `createdAt`.
- `wishLists/{id}/items/{itemId}`: `name`, `link`, `notes`, `price`, `createdAt`.
- `wishLists/{id}/purchases/{itemId}`: `purchased`, `purchasedBy`, `updatedAt`.

Removing a wish atomically removes its purchase document. Removing a list
archives its metadata and disables sharing atomically. Archived lists and
their child documents remain stored but cannot be read publicly, edited,
or reopened by the client. This avoids incomplete recursive deletion and
keeps concurrent writes from reviving a removed list.

## Rules and deployment

Deployed with owner approval on 2026-09-02: shared Firestore rules to
`tyler-busick-22`, then Family hosting to `busick-recipes`. Verified the live
rules exactly match `firestore.shared.rules`; both sibling rules files now
contain the same permissions, preserving their pre-existing edits. Verified
the HTML, main JavaScript and CSS match the production build at both
`https://family.tylerbusick.com` and `https://busick-recipes.web.app`, including
the public route's no-index, no-referrer and no-store headers.

- Published entry: `/assets/index-UY-AYVxI.js`.
- New ruleset: `0162c9d6-3a2d-46e9-bd34-c843e89d8bdf`.
- Previous ruleset, retained by Firebase: `e5aa5509-c271-4baa-a39a-8f5ade674b1f`.
- Validation: 16 tests passed during implementation; lint, unit tests and
  production build passed again before deployment. Mobile/desktop UI and
  signed-out sharing were verified against local emulators before deployment.

Hosting is in `busick-recipes`; live Auth/Firestore is in `tyler-busick-22`.
The root `firestore.rules` is the historical busick-recipes ruleset and is
not the ruleset to deploy for this feature. It is no longer referenced by
`firebase.json` either, so a bare `firebase deploy` from this folder deploys
hosting only and cannot push the wrong ruleset by accident.

`firestore.shared.rules` preserves the dashboard's current shared-project
rules and adds the isolated wish-list rules. `firebase.wishlists.json`
selects that file. Before an owner-approved deployment, compare its baseline
with the current live rules and sync the new match block into dashboard and
Accomplish's canonical rules files, so a later sibling deploy won't remove
these permissions. Never add `wishLists` to the recursive `familyShared()`
allowlist: doing so would also grant family access to purchases.

After that comparison and rules synchronization, deploy rules explicitly to
`tyler-busick-22` with `--config firebase.wishlists.json --only firestore:rules`.
Build and deploy Family hosting separately to `busick-recipes`. No deployment
is performed by development or test commands.

## Verification

`npm test` checks field normalization and safe links. `npm run test:rules`
runs privacy, CRUD, revocation, and shared-project regression cases using a
local Firestore emulator and the demo project `demo-family-wishes`.

For a local browser check, start the emulators with
`firebase emulators:start --config firebase.wishlists.json --only auth,firestore --project demo-family-wishes`,
then run `VITE_FIREBASE_EMULATORS=true npm run dev`. This development-only
mode uses demo configuration, not a real Firebase project. Emulator sign-in
can use the existing parent's email. If the preview browser does not expose
the OAuth popup, open `/tests/preview.html` for a guarded emulator-only demo
sign-in using Firebase's documented mock-IDP flow. No production auth bypass
is included, and this test entry is excluded from the build.
