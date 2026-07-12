# Busick Family Hub

A private family dashboard that pulls meals, planning, kids' tasks, routines,
and shared info into one site.

- **Stack:** static HTML/CSS/JS, no build step. Firebase for data and login.
- **Firebase project:** `busick-recipes` (see `.firebaserc`).
- **Firebase services:** Firestore (shared family data), Auth (sign-in), Hosting.

## Layout

Everything deployed lives in `public/` (that's the `hosting.public` folder):

- `index.html` / `index.js` — the main dashboard
- `recipes.html` / `recipes.js` — meals area
- `productivity.html` / `productivity.js` — planner
- `kids.html` / `kids.js` — kids area
- `login.html` — sign-in
- `shared-firebase.js` — connects the site to Firebase (the data layer)
- `shared-utils.js`, `shared.css` — shared helpers and styles
- `sw.js`, `manifest.json` — service worker + PWA config

Each page is one HTML file plus a matching JS file for its behavior; styling is
in the `.css` files.

## Working on it

- Front-end wording/layout → the `.html` and `.css` files.
- Behavior → the matching `.js` file.
- Anything touching login or stored data → `shared-firebase.js` and `firestore.rules`.
- Deploy: `firebase deploy` (or `--only hosting` / `--only firestore:rules`).
- `firebase.json` sets strict security headers (CSP etc.) — if you add an
  external script, image host, or frame, update the CSP there or it'll be blocked.

## Current focus

_Nothing in progress. Add the current task, recent changes, and gotchas here as you go._
