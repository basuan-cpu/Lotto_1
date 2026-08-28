const CACHE = 'lotto-v5'; // bei zukünftigen Änderungen an icons/manifest hochzählen
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  // Promise.allSettled statt addAll: eine einzelne fehlende Datei (z.B. falscher
  // Pfad) blockiert dann nicht mehr die komplette Installation des Workers.
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(FILES.map(f => c.add(f)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const isHtml = req.mode === 'navigate' || req.url.endsWith('index.html') || req.url.endsWith('/');

  if (isHtml) {
    // Network-first: immer versuchen, die aktuelle Version zu holen.
    // cache:'no-store' erzwingt, dass der Browser NICHT aus seinem eigenen
    // HTTP-Cache antwortet, sondern wirklich zum Server geht.
    // Nur wenn offline/kein Netz, auf den Cache zurückfallen.
    e.respondWith(
      fetch(req, {cache: 'no-store'})
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    // Statische Assets (Icons, Manifest): cache-first wie bisher, spart Traffic.
    e.respondWith(
      caches.match(req).then(r => r || fetch(req))
    );
  }
});
