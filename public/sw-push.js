// Web Push Service Worker — iDEA Business
// Standalone push handler. Does NOT cache app shell (that's reserved for PWA SW).

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: "إشعار جديد", body: event.data?.text() || "" }; }
  const title = payload.title || "حراج المشاريع";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/og-logo.png",
    badge: payload.badge || "/og-logo.png",
    image: payload.image,
    data: { url: payload.url || "/" },
    actions: payload.actions || [],
    dir: "rtl",
    lang: "ar",
    tag: payload.tag,
    requireInteraction: !!payload.requireInteraction,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((wins) => {
      const existing = wins.find((w) => w.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
