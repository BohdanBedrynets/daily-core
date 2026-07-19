const CACHE_NAME = "yadro-dnya-v2-5-cloud-sync";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./src/css/base.css",
  "./src/css/layout.css",
  "./src/css/components.css",
  "./src/js/app.js",
  "./src/js/firebase-config.js",
  "./src/js/config/tasks.js",
  "./src/js/services/date.service.js",
  "./src/js/services/storage.service.js",
  "./src/js/services/day.service.js",
  "./src/js/services/statistics.service.js",
  "./src/js/services/calendar.service.js",
  "./src/js/services/goals.service.js",
  "./src/js/services/time.service.js",
  "./src/js/services/achievements.service.js",
  "./src/js/services/annual-report.service.js",
  "./src/js/services/sync.service.js",
  "./src/js/ui/render.js",
  "./src/js/ui/status.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return Response.error();
      });
    })
  );
});
