// Offline play. After one visit the browser keeps the game; if the site cannot be reached later
// (no internet, server down) the same address opens the game instead of the browser's error page.
// Only the game's own static files are kept. Accounts, saves and every API call always go to the network.
const CACHE = 'stonktrooper-offline-v1';
const SHELL = new URL('./', self.location).pathname;
const API = /\/(auth|save|profile|monthly-squeeze)(\/|$)/;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('stonktrooper-offline-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || API.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    // The page itself: the live site when reachable (and refreshed), the kept game when not.
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(SHELL, copy)); }
      return response;
    }).catch(() => caches.match(SHELL).then(page => page || Response.error())));
    return;
  }
  // Scripts, styles, images, fonts: keep what was fetched, serve it instantly, refresh in the background.
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request).then(cached => {
    const refresh = fetch(request).then(response => { if (response.ok) cache.put(request, response.clone()); return response; }).catch(() => cached || Response.error());
    return cached || refresh;
  })));
});
