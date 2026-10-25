/* The static build replaces these two declarations with a content hash and an
   explicit list of public app files. No runtime/API response is ever cached. */
const BUILD = "development";
const FILES = [];
const BASE = new URL("./", self.location.href);
const PREFIX = `faithful-shell:${BASE.pathname}:`;
const CACHE = PREFIX + BUILD;
const ASSETS = new Set(FILES.map(file => new URL(file, BASE).href));
const isAppPage = url => url.origin === BASE.origin &&
  [BASE.pathname, BASE.pathname + "index.html"].includes(url.pathname);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    if (!FILES.length) throw new Error("Build the static site before installing.");
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll([...ASSETS].map(url => new Request(url, {
        cache: "reload", credentials: "omit", redirect: "error",
      })));
    } catch (error) {
      await caches.delete(CACHE);
      throw error; // Keep the working version if any public asset fails.
    }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys())
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    // A first visit remains uncontrolled until navigation. Upgrades only skip
    // waiting after every open app window confirms it can safely refresh.
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== BASE.origin) return;
  const appNavigation = request.mode === "navigate" && isAppPage(url);
  if (!appNavigation && (!ASSETS.has(url.href) || url.search)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(appNavigation ? BASE.href : request) || fetch(request);
  })());
});

function canRefresh(client) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 2000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close(); resolve(event.data === true);
    };
    client.postMessage({type: "PWA_CAN_REFRESH"}, [channel.port2]);
  });
}

self.addEventListener("message", event => {
  if (event.data?.type !== "PWA_APPLY_UPDATE" || !event.source?.url ||
      !isAppPage(new URL(event.source.url))) return;
  event.waitUntil((async () => {
    const clients = (await self.clients.matchAll({type: "window", includeUncontrolled: true}))
      .filter(client => isAppPage(new URL(client.url)));
    const ready = clients.length > 0 && (await Promise.all(clients.map(canRefresh))).every(Boolean);
    event.ports[0]?.postMessage({ready});
    if (ready) await self.skipWaiting();
  })());
});
