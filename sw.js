// Crib service worker: offline app shell, cached language packs and fonts.
const VERSION = 'crib-v2'; // bump on every release so the shell is re-cached
const FONTS = 'crib-fonts-v1';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/views.js', './js/data.js', './js/srs.js', './js/store.js', './js/search.js',
  './js/speech.js', './js/ics.js', './js/ui.js', './js/util.js',
  './data/languages.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }).catch(() => new Response('', { status: 504 })));
    return;
  }
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // The language list is network-first, so newly added languages show up at once; cached copy when offline.
  if (url.pathname.endsWith('/data/languages.json')) {
    e.respondWith(caches.open(VERSION).then(c => fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; })
      .catch(async () => (await c.match(req, { ignoreSearch: true })) || new Response('Offline', { status: 503 }))));
    return;
  }

  // Stale-while-revalidate: instant from cache, refreshed in the background (packs included).
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('Offline', { status: 503 });
  }));
});
