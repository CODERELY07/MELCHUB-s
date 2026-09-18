"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import borrowerApi from "@/lib/borrower-axios";
import { ADMIN_LOGIN_PATH, PREFERRED_LOGIN_KEY } from "@/lib/auth-context";

/**
 * "/" is not a real destination page — it just figures out where a visitor
 * actually belongs and sends them there, so nobody has to pass through here
 * on the way to a dashboard they're already signed into. Checks the staff
 * session first (arbitrary priority for the rare case both exist on the same
 * browser — see docs/loans.md Part 5), then the borrower session, and — if
 * neither is currently valid — falls back to whichever login was used last
 * on this device (PREFERRED_LOGIN_KEY, set at login time), defaulting to the
 * borrower/client login the very first time.
 *
 * That fallback matters specifically for the installed PWA: its start_url
 * is "/", and a standalone installed app has no address bar to type
 * ADMIN_LOGIN_PATH into if this ever lands an admin on the wrong login. A
 * signed-out admin re-opening the installed app would otherwise be stuck on
 * the borrower login with no way to reach their own — see
 * docs/terms-and-pwa.md Part 5 for why that path is obscure/unlinked in the
 * first place, and why this fallback (not a visible "staff login" link) is
 * the fix that doesn't undo that.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function decide() {
      if (localStorage.getItem("token")) {
        try {
          await api.get("/user");
          if (!cancelled) router.replace("/admin/dashboard");
          return;
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 401) {
            localStorage.removeItem("token");
          } else {
            // Couldn't verify (offline, server hiccup) — don't sign the user
            // out just because of that. Trust the stored token for now and
            // let the dashboard's own offline-cache handling (see public/sw.js)
            // take over from here, same as opening it directly would.
            if (!cancelled) router.replace("/admin/dashboard");
            return;
          }
        }
      }

      if (localStorage.getItem("borrower_token")) {
        try {
          await borrowerApi.get("/borrower/me");
          if (!cancelled) router.replace("/portal");
          return;
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 401) {
            localStorage.removeItem("borrower_token");
          } else {
            if (!cancelled) router.replace("/portal");
            return;
          }
        }
      }

      if (!cancelled) {
        const preferred = localStorage.getItem(PREFERRED_LOGIN_KEY);
        router.replace(preferred === "admin" ? ADMIN_LOGIN_PATH : "/portal/login");
      }
    }

    decide();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
