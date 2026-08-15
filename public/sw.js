// Service Worker — Inventario Conos
// En desarrollo, no cachear chunks de Next.js ni assets dinámicos.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // En desarrollo / preview, evitar cache de chunks de Next.
  if (process.env.NODE_ENV !== "production") {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open("conos-v1").then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
