"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) so the app can be installed
 * and used offline. Silently does nothing if the browser doesn't support
 * service workers, or if registration fails — offline support is a bonus,
 * not something the app depends on to function online.
 *
 * In development the worker is unregistered instead: its caches fight with
 * hot reloading and serve stale bundles, which breaks hydration.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      caches?.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal — the app still works fully online without it.
    });
  }, []);

  return null;
}
