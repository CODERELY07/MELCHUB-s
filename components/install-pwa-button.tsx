"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Chrome only surfaces a small, easy-to-miss icon in the address bar when a
 * site is installable — it does not show an obvious banner by default. This
 * gives borrowers/admins an explicit, unmissable "Install app" action instead
 * of relying on them noticing that icon. Renders nothing until the browser
 * actually fires beforeinstallprompt (already installed, unsupported browser,
 * or installability criteria not met all render nothing here too).
 */
export function InstallPwaButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) {
    return null;
  }

  return (
    <Button
      variant="outline"
      className="justify-start"
      onClick={async () => {
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
      }}
    >
      <Download className="size-4" />
      Install app
    </Button>
  );
}
