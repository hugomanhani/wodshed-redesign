const CACHE = "garage-wod-v44";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // navigations (the app shell itself) go network-first so a Home Screen launch always tries to
  // get the latest deploy while online — cache is just the offline fallback, not the default source
  const isNavigation = e.request.mode === "navigate" ||
    (e.request.method === "GET" && (e.request.headers.get("accept") || "").includes("text/html"));
  if (isNavigation) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }
  // everything else (icons, manifest) rarely changes — cache-first is fine and keeps it fast/offline-capable
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});
