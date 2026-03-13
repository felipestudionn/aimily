// Network-only PWA service worker
// Never serves cached content — always fetches from network.
// Only caches PWA shell icons so the app can install/launch.

const SHELL_CACHE = 'aimily-shell';

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Clean ALL old caches from previous versions
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() =>
      // Only cache the bare minimum for PWA install
      caches.open(SHELL_CACHE).then((cache) =>
        cache.addAll([
          '/images/aimily-pwa-512.png',
          '/images/aimily-pwa-192.png',
        ])
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Every request goes to the network. No cache, no stale content.
self.addEventListener('fetch', () => {
  // Do nothing — let the browser handle all requests normally.
  // This means the PWA always shows the latest deployed version.
});
