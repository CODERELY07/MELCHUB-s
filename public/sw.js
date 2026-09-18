// MELCHUB service worker — enables installing the app and using it offline.
//
// Strategy:
//  - Page navigations: network-first. Always load fresh HTML when online so
//    it matches the current JS bundles; fall back to the last cached copy of
//    that page only when offline. (Serving stale HTML first breaks hydration
//    after a deploy, which turns the login forms into plain GET submits.)
//  - API requests (GET only): network-first. When online, always fetch fresh
//    data and refresh the cache with it. When offline, fall back to the last
//    cached response for that exact endpoint + logged-in account.
//  - Static assets (/_next/static, icons, images): stale-while-revalidate —
//    these are content-hashed, so a cached copy is always safe to serve.
//  - Everything else same-origin (Next.js's own RSC/navigation data fetches
//    for client-side <Link> transitions): stale-while-revalidate too. A hard
//    page reload is covered by the "navigate" case above, but clicking
//    between pages inside the installed app doesn't reload the document —
//    it fetches this instead, and without caching it, opening a page you
//    haven't already loaded *this session* would fail outright while
//    offline even though you'd visited it plenty of times before.
//  - Never intercepts non-GET requests: creating a loan, recording a
//    payment, uploading a screenshot, etc. always require a live network
//    connection and are never queued or faked offline.
//  - Never lets a failed fetch resolve to `undefined` — that surfaces in the
//    browser as ERR_FAILED ("This site can't be reached").
//
// None of this fabricates data that was never actually loaded: a page (or
// its data) only ever works offline because it was genuinely fetched at
// least once while online, exactly like every browser cache.

const PAGE_CACHE = "melchub-pages-v2";
const API_CACHE = "melchub-api-v2";
const ASSET_CACHE = "melchub-assets-v2";
const RSC_CACHE = "melchub-rsc-v1";
const CACHES = [PAGE_CACHE, API_CACHE, ASSET_CACHE, RSC_CACHE];

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
            .filter((key) => !CACHES.includes(key))
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
  const sameOrigin = url.origin === self.location.origin;
  const isApi = url.pathname.startsWith("/api/") || url.pathname.includes("/api/");

  if (isApi) {
    event.respondWith(networkFirst(request, API_CACHE, apiCacheKey(request)));
    return;
  }

  // Leave other cross-origin requests (fonts, Supabase storage, …) alone.
  if (!sameOrigin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE, url.origin + url.pathname));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|webp|jpg|jpeg|woff2?)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // Next.js's own RSC/navigation-data fetches for client-side <Link>
  // transitions — see the top-of-file note on why these need caching too.
  event.respondWith(staleWhileRevalidate(request, RSC_CACHE));
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

async function networkFirst(request, cacheName, key) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || cacheName === API_CACHE)) {
      cache.put(key, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(key);
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || Response.error());

  return cached || network;
}
