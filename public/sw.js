/* Rooted service worker.
 *
 * - Pages: network first, so a new deploy shows up on the next launch; falls
 *   back to the cached app shell when offline.
 * - Hashed build files (/_expo/static/…) and icons/fonts: cache first. Their
 *   names change on every build, so they can never go stale.
 * - Never caches API or cross-origin requests.
 *
 * __BUILD_ID__, __BASE__ and __PRECACHE__ are filled in at build time
 * (scripts/postbuild-web.mjs): each deploy gets its own caches, precaches
 * every route so the app works offline, and deletes old caches on activate.
 */
const BUILD = '__BUILD_ID__';
/** Sub-path the app is hosted under ('' at the site root). */
const BASE = '__BASE__';
const SHELL = `shell-${BUILD}`;
const STATIC = `static-${BUILD}`;
/** Every build file (route code, fonts, icons), injected at build time. */
const PRECACHE = '__PRECACHE__';

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL).then((c) => c.addAll([`${BASE}/`, `${BASE}/manifest.json`])),
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
  if (url.origin !== self.location.origin || url.pathname.startsWith(`${BASE}/api/`)) return;
  const path = url.pathname.slice(BASE.length);

  // App navigations: network first, cached shell when offline (SPA routes all serve index.html).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only a real 200 refreshes the cached shell. (GitHub Pages answers deep
          // links with 404.html, which is the same app shell, but with status 404.)
          if (res.ok && new URL(res.url).pathname === `${BASE}/`) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(`${BASE}/`, copy));
          }
          return res;
        })
        .catch(() => caches.match(`${BASE}/`)),
    );
    return;
  }

  // Immutable build output and static assets: cache first.
  if (path.startsWith('/_expo/') || path.startsWith('/assets/') || path.startsWith('/icons/')) {
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

// ---- Web push: the smart-timing nudge. Payload is {title, body, url}; never the question itself.
self.addEventListener('push', (event) => {
  let data = { title: 'Rooted', body: 'One question for tonight.', url: `${BASE}/home` };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: `${BASE}/icons/icon-192.png`,
      badge: `${BASE}/icons/icon-192.png`,
      tag: 'rooted-nudge',
      renotify: false,
      data: { url: data.url.startsWith('http') ? data.url : `${BASE}${data.url.startsWith('/') ? data.url : `/${data.url}`}` },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? `${BASE}/home`;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
