// ScoreKeep offline support. Keeps a copy of the app on the device so it opens with no signal.
// The app page comes from the network when there is one (so updates arrive right away) and from
// the saved copy when there isn't. Icons and fonts come from the saved copy.
// Bump VERSION when the list of files below changes.
const VERSION = "scorekeep-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];
const NETWORK_WAIT = 4000;   // on a weak signal, fall back to the saved copy after this many ms

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("slow network")), NETWORK_WAIT);
    fetch(request).then(res => { clearTimeout(timer); resolve(res); }, err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    // Pages: newest from the network, saved copy when offline or the signal is too slow
    event.respondWith(
      fromNetwork(request)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); }
          return res;
        })
        .catch(() => caches.match(request, { ignoreSearch: true })
          .then(hit => hit || caches.match("index.html"))
          .then(hit => hit || caches.match("./")))
    );
    return;
  }

  // Everything else (icons, fonts): saved copy first, otherwise fetch it and keep a copy
  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); }
      return res;
    }))
  );
});
