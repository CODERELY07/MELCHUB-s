// MELCHUB service worker — enables installing the app and using it offline.
//
// Strategy:
//  - API requests (GET only): network-first. When online, always fetch fresh
//    data and refresh the cache with it — "if it has internet it will update
//    the data". When offline, fall back to the last cached response for that
//    exact endpoint + logged-in account, so a borrower/admin can still see
//    their last-known loan info with no connection.
//  - Everything else (pages, JS, CSS, images): stale-while-revalidate — serve
//    instantly from cache if we have it, then quietly refresh in the
//    background.
//  - Never intercepts non-GET requests: creating a loan, recording a
//    payment, uploading a screenshot, etc. always require a live network
//    connection and are never queued or faked offline. That's deliberate —
//    silently "succeeding" a financial write while offline, then failing to
//    sync it later, would be worse than just telling the user it needs a
//    connection.

const PAGE_CACHE = "melchub-pages-v1";
const API_CACHE = "melchub-api-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PAGE_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isApi = url.pathname.startsWith("/api/") || url.pathname.includes("/api/");

  if (isApi) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Cache API responses keyed by URL + a short slice of the caller's bearer
 * token (if any), so switching accounts on the same device/browser can never
 * serve one person's cached loan data to another while offline.
 */
function apiCacheKey(request) {
  const auth = request.headers.get("Authorization") || "";
  const suffix = auth ? `#${auth.slice(-16)}` : "";
  return request.url + suffix;
}

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  const key = apiCacheKey(request);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(key, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(key);
    if (cached) {
      return cached;
    }
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}
