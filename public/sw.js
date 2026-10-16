// Minimal service worker so phones offer "Install app" (needed for Share to Ariadne). No caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
