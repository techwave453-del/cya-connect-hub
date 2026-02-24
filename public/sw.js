const CACHE_NAME = 'cya-static-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/main.tsx',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(self.clients.claim());
});

// Simple cache-first for navigation and static assets, network-first for API
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass non-GET
  if (request.method !== 'GET') return;

  // Network-first for function/API requests
  if (url.pathname.startsWith('/functions') || url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          return resp;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Cache-first for navigation / assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          // Put a copy in cache
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
          return resp;
        })
        .catch(() => {
          // If navigation, return fallback
          if (request.mode === 'navigate') return caches.match('/offline.html');
        });
    })
  );
});

// Listen for background sync event and notify clients to run sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event', event.tag);
  if (event.tag === 'cya-sync') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'cya-sync' });
        }
      })
    );
  }
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'skipWaiting') {
    self.skipWaiting();
  }
});
