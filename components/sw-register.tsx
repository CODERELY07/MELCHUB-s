"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) so the app can be installed
 * and used offline. Silently does nothing if the browser doesn't support
 * service workers, or if registration fails — offline support is a bonus,
 * not something the app depends on to function online.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Not fatal — the app still works fully online without it.
      });
    }
  }, []);

  return null;
}
