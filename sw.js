// Çevrimdışı oynanabilsin diye oyun dosyalarını önbelleğe alır.
// Kendi dosyalarımız önce ağdan istenir (güncellemeler hemen gelsin), ağ yoksa önbellekten açılır.
// CDN'deki sabit sürümlü Three.js önbellekten gelir.
const CACHE = 'cekirdek-v5';
const SRC = ['main', 'config', 'utils', 'state', 'audio', 'quality',
  'engine/scene', 'engine/assets', 'engine/models', 'engine/fx', 'engine/perf',
  'world/street', 'world/units', 'world/weather',
  'sim/grid', 'sim/economy', 'sim/people', 'sim/staff', 'sim/day', 'sim/regulars', 'sim/rival', 'sim/events', 'sim/quests', 'sim/branches', 'sim/progress', 'sim/offline', 'sim/customs',
  'ui/toast', 'ui/overlay', 'ui/hud', 'ui/panels', 'ui/modal', 'ui/input', 'ui/minigame', 'ui/photo', 'ui/tutorial'].map(f => `./src/${f}.js`);
const ASSETS = ['./', './index.html', './styles.css', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', ...SRC,
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (sameOrigin) {
    e.respondWith(fetch(req)
      .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
