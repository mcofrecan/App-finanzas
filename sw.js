/* Service worker: guarda la app en el teléfono para que funcione sin conexión.
   Al publicar una versión nueva, sube VERSION. */
const VERSION = "cf-v1.0.0";
const ASSETS = ["./", "index.html", "css/app.css", "js/calc.js", "js/store.js", "js/app.js", "manifest.webmanifest",
  "data/plan-origen.json", "vendor/xlsx.mini.min.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
  "fonts/public-sans-latin-400-normal.woff2", "fonts/public-sans-latin-500-normal.woff2", "fonts/public-sans-latin-600-normal.woff2",
  "fonts/public-sans-latin-700-normal.woff2", "fonts/bricolage-grotesque-latin-700-normal.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
self.addEventListener("notificationclick", e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: "window" }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./"))); });
