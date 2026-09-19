"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { lastSyncedAt } from "@/lib/offline-cache";

/**
 * A persistent, honest signal that data on screen is whatever the service
 * worker last cached, not necessarily current — see public/sw.js's
 * network-first strategy for /api/*. Shown across every page (mounted once
 * in AppShell) rather than per-page, so no page can forget to add it.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [synced, setSynced] = useState<string | null>(null);

  useEffect(() => {
    // Read the real value on mount — the initial `useState(true)` above has
    // to be a static default (no `window`/`navigator` at first render on
    // the server), so this corrects it right after hydration. Same
    // deferred-to-effect reasoning as the iOS check in install-pwa-button.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    setSynced(lastSyncedAt());

    const goOnline = () => setOnline(true);
    const goOffline = () => {
      setSynced(lastSyncedAt());
      setOnline(false);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-center text-xs font-medium text-warning-ink">
      <WifiOff className="size-3.5 shrink-0" />
      <span>
        You&apos;re offline — this is the last data saved
        {synced ? ` (${new Date(synced).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })})` : ""}. Go online to get the latest.
      </span>
    </div>
  );
}
