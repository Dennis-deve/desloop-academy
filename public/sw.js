/* Retirement worker: the old offline shell could serve obsolete simulated routes.
 * Keep this URL until existing installations update; do not cache content or API data.
 */
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('desloop-public-shell-')).map((key) => caches.delete(key)))),
      self.registration.unregister(),
    ]).then(() => self.clients.claim()),
  );
});
