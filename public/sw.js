// Busick Family PWA Service Worker
// Path A: app-shell cache with versioning.
//   - cache-first for static assets (CSS, JS, icons, fonts)
//   - network-first for HTML (always fresh when online, falls back to cache offline)
//   - Firebase / Google / Fonts requests bypass the SW entirely
//
// To deploy an update: bump CACHE_VERSION. Old caches are purged on activate.

const CACHE_VERSION = "v10-2026-05-29-parent-tile-mobile-tap";
const CACHE_NAME = `busick-family-${CACHE_VERSION}`;

// Files cached on install. Add new long-lived assets here when you create them.
const APP_SHELL = [
  "./",
  "index.html",
  "login.html",
  "recipes.html",
  "productivity.html",
  "kids.html",
  "404.html",
  "shared.css",
  "shared-firebase.js",
  "shared-utils.js",
  "index.js",
  "recipes.js",
  "productivity.js",
  "kids.js",
  "recipes.css",
  "productivity.css",
  "kids.css",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// Hosts whose requests should never be cached or proxied — pass straight through.
const BYPASS_HOSTS = [
  "firestore.googleapis.com",
  "firebaseio.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "www.gstatic.com",            // Firebase SDK CDN — versioned URLs, keep fresh
  "fonts.googleapis.com",        // Google Fonts CSS — small, browser cached
  "fonts.gstatic.com",           // Google Fonts files
  "googleusercontent.com",       // User avatars — let browser handle via img-src
  "calendar.google.com",
  "accounts.google.com",
  "apis.google.com",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(err => {
        // If any single file fails (e.g. doesn't exist yet), still install.
        console.warn("[sw] partial app-shell cache:", err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function shouldBypass(url) {
  return BYPASS_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host));
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Only ever intercept our own origin. Everything else (avatars on
  // googleusercontent, Google Calendar embed, Firebase SDK CDN, Google Fonts,
  // analytics, etc.) goes straight to the browser — so CSP is evaluated
  // against the original request type (img-src for an <img>, etc.) instead
  // of being routed through the SW where it would be treated as connect-src.
  if (url.origin !== self.location.origin) return;

  // Belt-and-suspenders for any explicit bypass hosts.
  if (shouldBypass(url)) return;

  const isHTML = req.mode === "navigate"
    || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Network-first for HTML, but NEVER cache the response — caching it
    // would freeze the CSP / cache-control / etc. headers from the moment
    // it was cached and re-serve them on later loads, defeating header updates.
    event.respondWith(
      fetch(req).catch(() => caches.match("index.html") || Response.error())
    );
    return;
  }

  // Cache-first for everything else (CSS, JS, icons, fonts) on our origin.
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit || Response.error());
    })
  );
});
