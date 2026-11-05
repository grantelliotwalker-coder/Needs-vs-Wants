// Offline support. Network first (so updates show up straight away), cache as fallback.
const CACHE = "nvw-v1";
const CORE = [
  "/", "/index.html", "/tools.html", "/incomeAnalyser.html", "/savings.html",
  "/mortgageCalculator.html", "/stampDutyCalculator.html", "/taxCalculator.html",
  "/taxDeductible.html", "/mortgage-training.html", "/tax-deductible-training.html", "/export.html",
  "/assets/css/base.css", "/assets/js/calc.js", "/assets/js/store.js", "/assets/js/app.js",
  "/skin-modal.js", "/modal-info.js", "/manifest.webmanifest", "/assets/icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("/index.html")))
  );
});
