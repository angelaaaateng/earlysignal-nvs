/* EarlySignal service worker.
 *
 * - Pages: network first, so a new deploy shows up on the next launch; falls
 *   back to the cached app shell when offline.
 * - Hashed build files (/_expo/static/…) and icons/fonts: cache first. Their
 *   names change on every build, so they can never go stale.
 * - Never caches API or cross-origin requests.
 *
 * __BUILD_ID__ and __PRECACHE__ are filled in at build time
 * (scripts/postbuild-web.mjs): each deploy gets its own caches, precaches
 * every route so the app works offline, and deletes old caches on activate.
 */
const BUILD = '__BUILD_ID__';
const SHELL = `shell-${BUILD}`;
const STATIC = `static-${BUILD}`;
/** Every build file (route code, fonts, icons), injected at build time. */
const PRECACHE = '__PRECACHE__';

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.json'])),
      caches.open(STATIC).then((c) => c.addAll(Array.isArray(PRECACHE) ? PRECACHE : [])),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // App navigations: network first, cached shell when offline (SPA routes all serve index.html).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Immutable build output and static assets: cache first.
  if (url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
