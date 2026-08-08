const CACHE_NAME = "bhavi-crm-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never touch API calls or Supabase — always network
  if (url.pathname.startsWith("/api") || url.hostname.includes("supabase.co")) {
    return;
  }

  // Navigations (HTML pages) — always fetch fresh, fall back to cache if offline
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Static assets (_next/static, images, fonts) — cache first
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(e.request, clone));
          }
          return response;
        });
      }),
    );
  }
});
