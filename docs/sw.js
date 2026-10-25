/* The static build replaces these two declarations with a content hash and an
   explicit list of public app files. No runtime/API response is ever cached. */
const BUILD = "2e1082f8b1dc8ff4699e";
const FILES = ["./accounts.js","./app-icon-192.png","./app-icon-512.png","./app-icon-maskable-512.png","./app.js","./apple-touch-icon.png","./artist-catalog.js","./artist-collections.js","./artist-portraits.js","./autosave.js","./backup.js","./catalog-analysis-data.js","./catalog-analysis.js","./catalog-recordings.js","./catalog-selection.js","./catalog.js","./collection-art.js","./collection-browse.js","./collections.js","./config.js","./connection.js","./core.js","./criteria.js","./evaluation.js","./expanded-catalog.js","./fuzzy-search.js","./index-views.js","./","./landing.js","./lenses.js","./library-audit.js","./manifest.webmanifest","./modern-catalog.js","./organization-ui.js","./organizations.js","./plan-import.js","./plan-templates.js","./plan-ui.js","./planning.js","./prewritten-reviews.js","./profile.js","./pwa.js","./recordings.js","./repertoire-data.js","./save-status.js","./saving.js","./scoring.js","./seeds.js","./shortlist-data.js","./shortlist-review.js","./song-details.js","./song-files.js","./song-index.js","./song-presentation.js","./song-resources.js","./song-state.js","./song-visuals.js","./styles.css","./text-stats.js","./theme.css","./version-history-ui.js","./version-history.js","./workspace-evaluation-ui.js","./workspace-evaluation.js","./workspace-merge.js"];
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
