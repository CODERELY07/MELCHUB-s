"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/lib/auth-context";
import { BorrowerAuthProvider } from "@/lib/borrower-auth-context";

/**
 * Both auth contexts are global, not just BorrowerAuthProvider scoped under
 * /portal — the unified login page (client/app/login/page.tsx) needs both
 * useAuth() and useBorrowerAuth() available in one place to try each login
 * in turn and know immediately which one succeeded, without a full reload.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BorrowerAuthProvider>{children}</BorrowerAuthProvider>
    </AuthProvider>
  );
}
