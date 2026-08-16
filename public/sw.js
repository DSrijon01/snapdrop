const CACHE_NAME = 'street-sync-cache-v1';

const STATIC_ASSETS = [
  './',
  './manifest.json',
  './logo.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './apple-touch-icon.png',
  './maskable-icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not cache API calls, Solana RPCs, Jupiter, or WebSockets
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('solana.com') ||
    url.hostname.includes('helius') ||
    url.hostname.includes('quicknode') ||
    url.hostname.includes('jup.ag') ||
    url.protocol.startsWith('ws')
  ) {
    return;
  }

  // Stale-While-Revalidate for static assets & pages
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
