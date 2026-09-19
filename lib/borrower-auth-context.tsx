"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import borrowerApi from "@/lib/borrower-axios";
import { cachedGet, clearCache } from "@/lib/offline-cache";
import type { Loan } from "@/lib/types";

interface BorrowerAuthContextValue {
  loan: Loan | null;
  loading: boolean;
  refresh: () => Promise<Loan | null>;
  logout: () => Promise<void>;
  setLoan: (loan: Loan) => void;
}

const BorrowerAuthContext = createContext<BorrowerAuthContextValue | undefined>(
  undefined
);

export function BorrowerAuthProvider({ children }: { children: ReactNode }) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("borrower_token")
        : null;

    if (!token) {
      setLoan(null);
      setLoading(false);
      return null;
    }

    try {
      // Falls back to the last saved copy when offline, so the borrower
      // stays signed in and sees their last-known loan.
      const data = await cachedGet<Loan>("me", () =>
        borrowerApi.get("/borrower/me").then((res) => res.data)
      );
      setLoan(data);
      return data;
    } catch {
      // Reached only for a real rejection (e.g. 401), or offline with
      // nothing cached yet.
      localStorage.removeItem("borrower_token");
      clearCache();
      setLoan(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Also exposed for imperative re-fetching right after login — see
    // client/lib/auth-context.tsx for why this rule is disabled here too.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await borrowerApi.post("/borrower/logout");
    } catch {
      // Token may already be invalid server-side — clearing local state below
      // is what actually signs the borrower out on this device either way.
    } finally {
      localStorage.removeItem("borrower_token");
      clearCache();
      setLoan(null);
    }
  }, []);

  return (
    <BorrowerAuthContext.Provider value={{ loan, loading, refresh, logout, setLoan }}>
      {children}
    </BorrowerAuthContext.Provider>
  );
}

export function useBorrowerAuth() {
  const ctx = useContext(BorrowerAuthContext);
  if (!ctx) {
    throw new Error("useBorrowerAuth must be used within a BorrowerAuthProvider");
  }
  return ctx;
}
