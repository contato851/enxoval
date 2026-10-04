// Service worker do Enxoval: guarda a página offline e os ícones.
// Os dados da lista sempre vêm da rede (precisam estar atualizados entre os dois).
const CACHE = "enxoval-v1";
const ESSENCIAIS = ["/offline.html", "/icons/icon.svg", "/icons/icon-192.png", "/placeholder.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }
  const url = new URL(req.url);
  if (url.origin === self.location.origin && ESSENCIAIS.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((r) => r || fetch(req)));
  }
});
