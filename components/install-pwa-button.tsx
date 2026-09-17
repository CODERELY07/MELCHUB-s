"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Every iOS browser is WebKit under the hood (Apple requires it), so this
 * also correctly catches "Chrome"/"Firefox" on iOS, which are really Safari
 * wearing a different icon — Add to Home Screen works identically regardless
 * of which one reports itself in the user agent.
 */
function isIos(): boolean {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS-specific "already added to home screen" signal.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Chrome only surfaces a small, easy-to-miss icon in the address bar when a
 * site is installable — it does not show an obvious banner by default. This
 * gives borrowers/admins an explicit, unmissable "Install app" action instead
 * of relying on them noticing that icon.
 *
 * iOS Safari never fires beforeinstallprompt at all — there's no
 * programmatic install API there, full stop, regardless of anything this app
 * does. The only way to install on iOS is the user manually tapping
 * Share → Add to Home Screen, so there this shows instructions for that
 * instead of silently rendering nothing.
 */
export function InstallPwaButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [showIosButton, setShowIosButton] = useState(false);

  useEffect(() => {
    if (isIos()) {
      if (!isStandalone()) {
        // Deferred to an effect (not a useState lazy initializer) so the
        // first client render matches the server-rendered markup (neither
        // knows it's iOS yet) and only updates after hydration completes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowIosButton(true);
      }
      return;
    }

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

  if (showIosButton) {
    return (
      <>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => setShowIosInstructions(true)}
        >
          <Download className="size-4" />
          Install app
        </Button>

        <Modal
          open={showIosInstructions}
          onClose={() => setShowIosInstructions(false)}
          title="Install this app on your iPhone/iPad"
          description="iOS doesn't let a website trigger this on its own — a couple of manual taps in Safari:"
        >
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              Tap the <strong>Share</strong> button in Safari&apos;s toolbar (the square with an
              arrow pointing up).
            </li>
            <li>
              Scroll down the menu and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> in the top-right corner.
            </li>
          </ol>
          <Button className="w-full" onClick={() => setShowIosInstructions(false)}>
            Got it
          </Button>
        </Modal>
      </>
    );
  }

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
