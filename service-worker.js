const HM_PWA_VERSION = 'v1.0-step6-2-14-56';
const HM_STATIC_CACHE = `hearme2nite-static-${HM_PWA_VERSION}`;
const HM_RUNTIME_CACHE = `hearme2nite-runtime-${HM_PWA_VERSION}`;
const HM_OFFLINE_URL = '/offline.html';

const HM_PRECACHE_URLS = [
  HM_OFFLINE_URL,
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(HM_STATIC_CACHE)
      .then((cache) => cache.addAll(HM_PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('hearme2nite-') && ![HM_STATIC_CACHE, HM_RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/functions') || url.pathname.includes('/__/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (/\.(?:css|js|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  if (/\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstNavigation(request) {
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    return fresh && fresh.ok ? fresh : (await caches.match(HM_OFFLINE_URL)) || fresh;
  } catch (error) {
    return caches.match(HM_OFFLINE_URL);
  }
}

async function networkFirstAsset(request) {
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.ok) {
      const cache = await caches.open(HM_RUNTIME_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(HM_RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request)
      .then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
      })
      .catch(() => {});
    return cached;
  }
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    return Response.error();
  }
}
