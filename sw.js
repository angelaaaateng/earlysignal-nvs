/* EarlySignal service worker.
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
const BUILD = "8f8fb8c-mw5859qa";
/** Sub-path the app is hosted under ('' at the site root). */
const BASE = "/earlysignal-nvs";
const SHELL = `shell-${BUILD}`;
const STATIC = `static-${BUILD}`;
/** Every build file (route code, fonts, icons), injected at build time. */
const PRECACHE = ["/earlysignal-nvs/_expo/static/js/web/__common-40d4dbe27684ce2426c2891483e3a1cf.js","/earlysignal-nvs/_expo/static/js/web/__expo-metro-runtime-8c088df87a31e4e6accd81c554ec290d.js","/earlysignal-nvs/_expo/static/js/web/_layout-0334f8d69a530b274aa8da1a2034d94f.js","/earlysignal-nvs/_expo/static/js/web/_layout-0cc022c54ba5ba38e5631b5f615fc1e4.js","/earlysignal-nvs/_expo/static/js/web/_layout-0f7e1962a2c90cc43cf3edbef6215939.js","/earlysignal-nvs/_expo/static/js/web/_layout-851b7aa82bb5acddeba0827560b934fb.js","/earlysignal-nvs/_expo/static/js/web/account-e685ee84fb8cfb84dc26ba6ab3a5e467.js","/earlysignal-nvs/_expo/static/js/web/add-quest-7656c4a5c1842d59335683f3c38e7f7d.js","/earlysignal-nvs/_expo/static/js/web/check-in-c0f8112704416bfc677ce6da4130e161.js","/earlysignal-nvs/_expo/static/js/web/diagnostics-325daf19c49b7ea6e22df572bf05cb14.js","/earlysignal-nvs/_expo/static/js/web/entry-51873442771c03b86a729170d9507178.js","/earlysignal-nvs/_expo/static/js/web/focus-e74a3d11f01a6c285302e180e6e60f70.js","/earlysignal-nvs/_expo/static/js/web/help-acdd7d352eda808a2193c60c14ca4791.js","/earlysignal-nvs/_expo/static/js/web/index-1c438ce4335f3b5fc1ef98ce5136cd25.js","/earlysignal-nvs/_expo/static/js/web/index-2ad745227800d0b6456f6b9b6d9bebd3.js","/earlysignal-nvs/_expo/static/js/web/index-c260d6a22bb46c50075247eda8304062.js","/earlysignal-nvs/_expo/static/js/web/index-fd49f80de76afa1cb39dbe7bc6523d7c.js","/earlysignal-nvs/_expo/static/js/web/me-5847008e5ffd960ff0383d4cfeeb75a6.js","/earlysignal-nvs/_expo/static/js/web/preview-e9f6f76e11fdb6a6f9b2916eee6f716e.js","/earlysignal-nvs/_expo/static/js/web/quests-216c9b5ef41f57c1262cb7e11f626cf9.js","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/bricolage-grotesque/200ExtraLight/BricolageGrotesque_200ExtraLight.0e66297d36d7f24484f3ec8a2232d6fc.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/bricolage-grotesque/300Light/BricolageGrotesque_300Light.a1f1439e622b6998c9b639bbf0a23f01.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.6586800789b30b19bbaeb349ca5d240a.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/bricolage-grotesque/500Medium/BricolageGrotesque_500Medium.1363130c7bdf956d164cb7e605619849.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.e5b5fc505484ff3ca24da73cba67c660.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.2f7de7a336f650f9cee5ed919cc3b003.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.5bfb4fa1f8907c768231d97bc27e8df9.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/200ExtraLight/NunitoSans_200ExtraLight.3e8fec45510219d8010929610dcf1c31.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/200ExtraLight_Italic/NunitoSans_200ExtraLight_Italic.80c1d0e9f6d7e17bcda1b43a74418108.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/300Light/NunitoSans_300Light.61fcf9f7f1f3f01bac50f86fece9e355.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/300Light_Italic/NunitoSans_300Light_Italic.197c491c3cf27e08ac45b8ac5f0de8a7.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/400Regular/NunitoSans_400Regular.9a446df4acd337a0803b98608aab1e66.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/400Regular_Italic/NunitoSans_400Regular_Italic.4e358c4515802e54eab629c1c9dea2c9.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/500Medium/NunitoSans_500Medium.fbd0884ddc5d2f3099b41283cc8f2f7d.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/500Medium_Italic/NunitoSans_500Medium_Italic.a7fc3d5a8757523df679909c02a9f428.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/600SemiBold/NunitoSans_600SemiBold.58a08cfbaf11a92ef3aaf80e768a16ad.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/600SemiBold_Italic/NunitoSans_600SemiBold_Italic.a14181b4de1722ef8685416e78708300.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/700Bold/NunitoSans_700Bold.d16d2c478d30947f35321066f798de6c.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/700Bold_Italic/NunitoSans_700Bold_Italic.142488d31da3ff3c2def10000eae9425.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/800ExtraBold/NunitoSans_800ExtraBold.08d068a6a911ec141fac7d6886d83817.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/800ExtraBold_Italic/NunitoSans_800ExtraBold_Italic.41671b3e04be174f4e0bf4e1768ef37f.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/900Black/NunitoSans_900Black.3678720c095a20d911d95d87f8b9fc9a.ttf","/earlysignal-nvs/assets/node_modules/@expo-google-fonts/nunito-sans/900Black_Italic/NunitoSans_900Black_Italic.b398cb96510b7865368fc0401adcc42d.ttf","/earlysignal-nvs/assets/node_modules/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@2x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@3x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@4x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@3x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@4x.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/react-navigation/elements/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png","/earlysignal-nvs/assets/node_modules/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png","/earlysignal-nvs/icons/apple-touch-icon.png","/earlysignal-nvs/icons/icon-192.png","/earlysignal-nvs/icons/icon-512.png","/earlysignal-nvs/icons/maskable-512.png"];

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
