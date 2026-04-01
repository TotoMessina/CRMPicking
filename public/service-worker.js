const CACHE_NAME = 'pickingup-crm-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

// Requests that should never be intercepted or cached
const shouldSkip = (request) => {
  const url = request.url;
  return (
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    request.method !== 'GET' ||
    !url.startsWith('http')
  );
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(() => { /* Silently ignore cache failures during install */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Skip non-cacheable or non-GET requests entirely
  if (shouldSkip(event.request)) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).catch(
          () => new Response(null, { status: 503, statusText: 'Offline' })
        );
      })
  );
});
