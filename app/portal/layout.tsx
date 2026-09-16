"use client";

import type { ReactNode } from "react";

import { BorrowerAuthProvider } from "@/lib/borrower-auth-context";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <BorrowerAuthProvider>{children}</BorrowerAuthProvider>;
}
