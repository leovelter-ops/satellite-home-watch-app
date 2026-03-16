/* =========================================================
   Satellite HW — Service Worker
   Enables PWA installability (Add to Home Screen)
   ========================================================= */

const CACHE_NAME = 'satellite-hw-v1';

// Core shell assets to pre-cache for offline / install support
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo.png',
  '/css/variables.css',
  '/css/base.css',
  '/css/landing.css'
];

// ── Install: cache core shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first with cache fallback ──────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin or CDN assets
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a copy of successful responses for core resources
        if (response && response.status === 200) {
          const url = event.request.url;
          if (
            url.includes('/images/') ||
            url.includes('/css/') ||
            url.includes('/js/') ||
            url.endsWith('index.html') ||
            url.endsWith('manifest.json')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, serve the shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
