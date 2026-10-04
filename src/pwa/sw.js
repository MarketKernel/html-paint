/**
 * Service worker of the GitHub Pages build (build/pages/): keeps the editor working offline
 * once it has been opened.
 *
 * build.mjs writes a hash of the page into CACHE, so every deploy changes this file's bytes:
 * the browser installs the new worker, which drops the previous cache. The open tab keeps
 * the old version until it reloads.
 *
 * Other projects may share the origin (a user's github.io), so only caches named paint-…
 * are this worker's to delete.
 */
const CACHE = 'paint-__VERSION__';
const SHELL = ['./', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('paint-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Any navigation inside the scope is the editor itself.
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./').then((cached) => cached ?? fetch(request)));
    return;
  }
  // The page fetches nothing itself (its CSP has connect-src 'none'): what comes here is
  // the manifest and the icons, all in the shell.
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((cached) => cached ?? fetch(request)));
});
