// Scripture Study service worker — Phase 9.
//
// PRIVACY GUARD: this worker caches ONLY public, read-only content — the app
// shell, static build assets, and (from Step 3) scripture/talk pages the user
// has opened. It must NEVER cache personal study data (notes, highlights,
// bookmarks, reading position) — that lives only in localStorage and never
// travels over the network — nor anything user-specific: the assistant API and
// all POST/server-action requests are passed straight through, never stored.
//
// Step 2 scope: app shell offline. Static assets are cached-first so the app
// can boot with no network; navigations are network-first and fall back to a
// calm offline page. Caching viewed chapters/talks comes in Step 3.

const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const KEEP = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE];

const OFFLINE_URL = "/offline";
const SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192",
  "/icon-512",
  "/icon-maskable",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL_ASSETS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    /\.(?:js|css|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|avif|ico)$/.test(
      url.pathname,
    )
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

// Public pages we cache for offline reading. Search needs the live API, so it
// is never cached (it still falls back to the offline page when offline).
function isCacheablePage(url) {
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname === "/search" || url.pathname.startsWith("/search/")) {
    return false;
  }
  return true;
}

// Network-first: always prefer fresh content when online so we never serve
// stale scripture, and store successful responses so the same page opens
// offline later. Documents fall back to the offline page; RSC requests fall
// back to a network error, which makes Next retry as a full navigation.
async function networkFirstPage(request, isNavigate, allowCache) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(request);
    if (allowCache && res && res.status === 200) {
      try {
        await cache.put(request, res.clone());
      } catch {
        // Some responses (e.g. Vary: *) can't be stored — skip silently.
      }
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (isNavigate) {
      const shell = await caches.open(SHELL_CACHE);
      return (await shell.match(OFFLINE_URL)) || Response.error();
    }
    return Response.error();
  }
}

// When a chapter/talk is opened via in-app (RSC) navigation, also warm its full
// HTML document so a later offline reload or relaunch to that URL works too —
// not just clicking back to it inside the app.
async function warmDocument(url) {
  const clean = new URL(url.href);
  clean.searchParams.delete("_rsc");
  const docRequest = new Request(clean.href, { headers: { Accept: "text/html" } });
  const cache = await caches.open(PAGES_CACHE);
  if (await cache.match(docRequest)) return;
  try {
    const res = await fetch(docRequest);
    if (res && res.status === 200) await cache.put(docRequest, res.clone());
  } catch {
    // Offline or failed — nothing to warm.
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never cache non-GET (server actions, the assistant POST) — pass through.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The assistant and any other API routes require the network — never cache.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  const isRSC = request.headers.get("RSC") === "1";
  const isPrefetch = request.headers.get("Next-Router-Prefetch") === "1";

  // Full document loads (relaunch, refresh, typed URL): always offer the
  // offline page as a last resort; cache the public ones for offline reading.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, true, isCacheablePage(url)));
    return;
  }

  // In-app navigation (RSC). Cache only what the reader actually opens, never
  // hover/viewport prefetches, so "viewed" means viewed.
  if (isRSC && !isPrefetch && isCacheablePage(url)) {
    event.respondWith(networkFirstPage(request, false, true));
    event.waitUntil(warmDocument(url));
  }
});
