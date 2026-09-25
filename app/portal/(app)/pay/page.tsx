"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Paying is now per-loan (a borrower can have more than one) — see
 * app/portal/(app)/loans/[id]/pay/page.tsx. This old fixed URL just sends
 * anyone who still has it bookmarked back to the loan list to pick one.
 */
export default function LegacyPortalPayRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal");
  }, [router]);

  return null;
}
