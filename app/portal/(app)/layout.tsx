"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, UserRound, Loader2 } from "lucide-react";

import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { LOGIN_PATH } from "@/lib/auth-context";
import { TermsModal } from "@/components/terms-modal";
import { AppShell } from "@/components/app-shell";

const NAV_ITEMS = [
  { href: "/portal", label: "My Loans", icon: LayoutDashboard },
  { href: "/portal/profile", label: "Profile", icon: UserRound },
];

export default function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { borrower, loading, logout, setBorrower } = useBorrowerAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !borrower) {
      router.replace(LOGIN_PATH);
    }
  }, [loading, borrower, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!borrower) {
    return null;
  }

  return (
    <>
      <AppShell
        title="My Loan Portal"
        navItems={NAV_ITEMS}
        // "My Loans" also stays highlighted while viewing/paying a specific
        // loan (/portal/loans/...) — those pages are reached from that tab.
        isActive={(href) =>
          pathname === href || (href === "/portal" && pathname.startsWith("/portal/loans"))
        }
        userLabel={borrower.name}
        onLogout={async () => {
          await logout();
          router.push(LOGIN_PATH);
        }}
      >
        {children}
      </AppShell>

      {!borrower.terms_accepted_at && (
        <TermsModal borrower={borrower} onAccepted={(updated) => setBorrower(updated)} />
      )}
    </>
  );
}
