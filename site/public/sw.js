// Keeps the site usable on a poor or missing connection.
// Pages, pictures and anything already looked at are kept on the device; bookings and prices
// that need the server still need a connection.
const CACHE = "celebrate-v1";
const SHELL = ["/", "/favicon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

const keep = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Every address is the same app, so the saved home page can stand in for any of them.
    event.respondWith(fetch(request).then((response) => keep("/", response)).catch(() => caches.match("/")));
  } else if (url.pathname.startsWith("/api/")) {
    // Fresh data when online; the last answer seen when not.
    event.respondWith(fetch(request).then((response) => keep(request, response)).catch(() => caches.match(request).then((hit) => hit ?? Response.error())));
  } else {
    // Scripts, styles, fonts and photographs: use the saved copy at once and refresh it in the background.
    event.respondWith(
      caches.match(request).then((hit) => {
        const fresh = fetch(request).then((response) => keep(request, response));
        if (hit) fresh.catch(() => {});
        return hit ?? fresh;
      })
    );
  }
});
