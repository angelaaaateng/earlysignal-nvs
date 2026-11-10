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
const BUILD = "7d65220-mwb1p1l7";
/** Sub-path the app is hosted under ('' at the site root). */
const BASE = "/earlysignal-nvs";
const SHELL = `shell-${BUILD}`;
const STATIC = `static-${BUILD}`;
/** Every build file (route code, fonts, icons), injected at build time. */
const PRECACHE = ["/earlysignal-nvs/_expo/static/js/web/__common-9ed527473c0c4515a60892c064c28eba.js","/earlysignal-nvs/_expo/static/js/web/__expo-metro-runtime-8c088df87a31e4e6accd81c554ec290d.js","/earlysignal-nvs/_expo/static/js/web/_layout-9d96ecea511aea1fde9bd904ff9153bf.js","/earlysignal-nvs/_expo/static/js/web/diagnostics-fbdf5afe7af0a8571f6d8933420e565c.js","/earlysignal-nvs/_expo/static/js/web/entry-e835f6ee457b7276b592ef7451439fbf.js","/earlysignal-nvs/_expo/static/js/web/event-f18635e0ecab7d08711f16dcc4831dae.js","/earlysignal-nvs/_expo/static/js/web/family-6729419d822addf19967199adfb79214.js","/earlysignal-nvs/_expo/static/js/web/grow-2ba5ac3f8f059253dde57df14d5ffefc.js","/earlysignal-nvs/_expo/static/js/web/home-f813ff718dae0222d88bb5b3e42bf938.js","/earlysignal-nvs/_expo/static/js/web/import-6e0dccd1f6c601888a237db752aceb88.js","/earlysignal-nvs/_expo/static/js/web/index-f110a7f2bc6994e207173e6e389c136f.js","/earlysignal-nvs/_expo/static/js/web/kid-0ad8e30d42e8eda22a132630e7f99383.js","/earlysignal-nvs/_expo/static/js/web/log-c89782edd6c52cf98438bca41452d0cc.js","/earlysignal-nvs/_expo/static/js/web/pilot-823e21b16a5e5a8118812dc09f53b134.js","/earlysignal-nvs/_expo/static/js/web/reset-password-8163a366e09c63693caf74b3c34cc722.js","/earlysignal-nvs/_expo/static/js/web/week-06a3904c566d372925121df418122f43.js","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/100Thin/GeistMono_100Thin.95eed4519d8c395e41b3b837ca97edea.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/100Thin_Italic/GeistMono_100Thin_Italic.2e50fb9a43d70ceb4925a2c54502097c.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/200ExtraLight/GeistMono_200ExtraLight.0714ea94ac265d76bc16698dd1808599.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/200ExtraLight_Italic/GeistMono_200ExtraLight_Italic.107f2670e94507223548f1d38eb14087.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/300Light/GeistMono_300Light.d6a3533adfd5834dd9f68ee37faa1e2d.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/300Light_Italic/GeistMono_300Light_Italic.09420cdceda8d1f1612daceae1e4890e.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/400Regular/GeistMono_400Regular.3656dcb247d3a6cd141f7601c2101125.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/400Regular_Italic/GeistMono_400Regular_Italic.88343c321b266476ad3bc56735cc6ac7.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/500Medium/GeistMono_500Medium.a298cd61aebdb709299e2a7deb73ed93.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/500Medium_Italic/GeistMono_500Medium_Italic.e149441dd9360bd7dbffeb1de9aa1685.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/600SemiBold/GeistMono_600SemiBold.cae945cb3b6156e396a1008b6252af21.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/600SemiBold_Italic/GeistMono_600SemiBold_Italic.e939ba436795ee2f0a379e7271bb957d.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/700Bold/GeistMono_700Bold.7fcc8478bc1dcadc865d97626ba3206b.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/700Bold_Italic/GeistMono_700Bold_Italic.8cc57ff1f3c45e7ed84e74853c141e06.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/800ExtraBold/GeistMono_800ExtraBold.b09b5457204e06ea7bacff03f0880065.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/800ExtraBold_Italic/GeistMono_800ExtraBold_Italic.0b4dd8c1b0e6d8791ea34c8f1417edfd.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/900Black/GeistMono_900Black.9ec025adf049c8a476588eeac81a36e4.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/geist-mono/900Black_Italic/GeistMono_900Black_Italic.8dfe24b2fef43fb3d535316e2412be7d.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/200ExtraLight/PlusJakartaSans_200ExtraLight.fdd89758261c9786825d3cdeaf8bc77d.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/200ExtraLight_Italic/PlusJakartaSans_200ExtraLight_Italic.61fa32023bed315ba0b30c3c65e72a4e.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/300Light/PlusJakartaSans_300Light.96e9519e0b4b43793371e04336d658cb.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/300Light_Italic/PlusJakartaSans_300Light_Italic.896f455ad601bd4cea2e2865e7f8ba82.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.dd3a1370a03dc0f2d7d093bd0ffe7c0b.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/400Regular_Italic/PlusJakartaSans_400Regular_Italic.991a0b32ae96c0baea0bde1d089c31c1.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.0a825b3e08f62af5a9bc9130843b12ff.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/500Medium_Italic/PlusJakartaSans_500Medium_Italic.398aa3fc207279a90a3311589d865743.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.73de6fb49299ccb6478575127008c120.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/600SemiBold_Italic/PlusJakartaSans_600SemiBold_Italic.949372fb28f6081d7f1704c83f96a64c.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.bac8ecad2d6da4aa6b4200699a80a9dd.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold_Italic/PlusJakartaSans_700Bold_Italic.0018f3803beb3f4896077c1a132a3623.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.f90855567d2c693a26e66f7184645099.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/plus-jakarta-sans/800ExtraBold_Italic/PlusJakartaSans_800ExtraBold_Italic.c28e0379a2d9a6e859e1729ba6a68a79.ttf","/earlysignal-nvs/assets/node_modules/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@2x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@3x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@4x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@3x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@4x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png","/earlysignal-nvs/icons/apple-touch-icon.png","/earlysignal-nvs/icons/icon-192.png","/earlysignal-nvs/icons/icon-512.png","/earlysignal-nvs/icons/maskable-512.png"];

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
