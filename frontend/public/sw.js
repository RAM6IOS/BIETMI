/* BIETMI ERP — minimal Service Worker (Installability only).
 *
 * SCOPE (strict): enables PWA installability. Caches ONLY static files
 * (app shell, icons, built CSS/JS). It NEVER caches API data:
 * any request under /api/* is passed straight to the network and is
 * never written to the cache. Invoices / quotes / partners / contracts
 * / company settings always require a live server connection.
 *
 * Real offline support (IndexedDB, sync, offline document creation) is
 * intentionally deferred to Phase 3 (field technicians only) — see
 * docs/TDD_v1.md. Bump CACHE_VERSION when deploying so stale caches are
 * pruned by the activate handler.
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `bietmi-static-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // STRICT BOUNDARY: API traffic is network-only, never cached or served
  // from cache. Invoice/quote/partner/contract data must always hit the server.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to the cached app shell so the
  // installed app opens deterministically.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  // Static assets (hashed JS/CSS, icons, fonts): cache-first, populating
  // the cache on first fetch. Hashed filenames keep each deploy unique.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});