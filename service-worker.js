const SHELL_CACHE = 'pitch-tracker-shell-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];
const SUPABASE_SCRIPT = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(CORE_ASSETS);
    try {
      const response = await fetch(SUPABASE_SCRIPT, { cache: 'no-cache' });
      if (response.ok) await cache.put(SUPABASE_SCRIPT, response);
    } catch (_) {
      // The app shell can still install; Supabase will be cached on a later online visit.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('pitch-tracker-shell-') && name !== SHELL_CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  if (url.href === SUPABASE_SCRIPT) {
    event.respondWith((async () => {
      const cached = await caches.match(SUPABASE_SCRIPT);
      const refresh = fetch(request).then(async response => {
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(SUPABASE_SCRIPT, response.clone());
        }
        return response;
      }).catch(() => null);
      return cached || (await refresh) || Response.error();
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
