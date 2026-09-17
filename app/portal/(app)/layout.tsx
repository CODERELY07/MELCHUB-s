"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, UserRound, Wallet, Loader2 } from "lucide-react";

import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { TermsModal } from "@/components/terms-modal";
import { AppShell } from "@/components/app-shell";

const NAV_ITEMS = [
  { href: "/portal", label: "My Loan", icon: LayoutDashboard },
  { href: "/portal/pay", label: "Pay", icon: Wallet },
  { href: "/portal/profile", label: "Profile", icon: UserRound },
];

export default function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loan, loading, logout, setLoan } = useBorrowerAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !loan) {
      router.replace("/portal/login");
    }
  }, [loading, loan, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!loan) {
    return null;
  }

  return (
    <>
      <AppShell
        title="My Loan Portal"
        navItems={NAV_ITEMS}
        isActive={(href) => pathname === href}
        userLabel={loan.name}
        onLogout={async () => {
          await logout();
          router.push("/portal/login");
        }}
      >
        {children}
      </AppShell>

      {!loan.terms_accepted_at && (
        <TermsModal loan={loan} onAccepted={(updated) => setLoan(updated)} />
      )}
    </>
  );
}
