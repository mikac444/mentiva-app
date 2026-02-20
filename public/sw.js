const CACHE_NAME = 'mentiva-v2';

// Only cache static assets, NOT Next.js JS chunks or API routes
const CACHEABLE = /\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Clean up ALL old caches on activation
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache static assets (images, fonts) — never JS chunks or API calls
  if (!CACHEABLE.test(url.pathname)) {
    return; // Let the browser handle it normally (no caching)
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
