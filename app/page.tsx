"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import borrowerApi from "@/lib/borrower-axios";

/**
 * "/" is not a real destination page — it just figures out where a visitor
 * actually belongs and sends them there, so nobody has to pass through here
 * on the way to a dashboard they're already signed into. Checks the staff
 * session first (arbitrary priority for the rare case both exist on the same
 * browser — see docs/loans.md Part 5), then the borrower session, and falls
 * back to the borrower/client login — not the staff one, which deliberately
 * lives at an obscure URL (see docs/terms-and-pwa.md Part 5) instead of
 * being the default entry point.
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

      if (!cancelled) router.replace("/portal/login");
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
