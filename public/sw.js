// Jim's Finance Tracker — Service Worker
// Strategy:
//   • Next.js static chunks (/_next/static/)  → cache-first  (content-hashed, safe forever)
//   • App-shell navigation (HTML pages)       → network-first, fallback to cached shell
//   • Everything else (Firebase, APIs, fonts) → pass-through, no interception

const CACHE_NAME = 'jims-finance-v1';

// Pages to warm-cache on install so the app shell is ready offline
const PRECACHE_URLS = ['/dashboard'];

// ── Skip-waiting message (from PwaRegister "Refresh" toast) ───────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────────
// Purge old cache versions so stale assets don't linger
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR (dev only, irrelevant in prod)
  if (url.pathname.includes('/_next/webpack-hmr')) return;

  // ── Static assets: cache-first ─────────────────────────────────────────────
  // Next.js content-hashes these filenames, so a cached copy is always valid.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Navigation requests: network-first ─────────────────────────────────────
  // Always try the network; fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(async () => {
          // Offline: return the cached version of this URL, or /dashboard as fallback
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/dashboard');
          return shell ?? new Response('Offline — please check your connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // All other requests (public assets, icons, etc.) — network-first, opportunistic cache
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
        return cached ?? networkFetch;
      })
    );
  }
  // Everything else falls through to the browser (Firebase SDK, etc.)
});
