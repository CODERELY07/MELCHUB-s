"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import borrowerApi from "@/lib/borrower-axios";
import { LOGIN_PATH } from "@/lib/auth-context";

/**
 * "/" is not a real destination page — it just figures out where a visitor
 * actually belongs and sends them there, so nobody has to pass through here
 * on the way to a dashboard they're already signed into. Checks the staff
 * session first (arbitrary priority for the rare case both exist on the same
 * browser — see docs/loans.md Part 5), then the borrower session, and falls
 * back to the one shared login page (client/app/login/page.tsx) if neither
 * is currently valid.
 *
 * There used to be two separate login pages and a "which one did this
 * device use last" fallback specifically so the installed PWA (whose
 * start_url is "/", with no address bar to correct a wrong guess) could
 * send a signed-out admin back to the right one — that whole problem is
 * gone now that there's only one login page for everyone to fall back to.
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

      if (!cancelled) router.replace(LOGIN_PATH);
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
