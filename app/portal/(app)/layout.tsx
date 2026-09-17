"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, UserRound, Wallet, LogOut, Loader2 } from "lucide-react";

import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { Button } from "@/components/ui/button";
import { TermsModal } from "@/components/terms-modal";
import { cn } from "@/lib/utils";

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
    <div className="flex min-h-screen bg-muted/20">
      <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground">
            M
          </div>
          <div className="text-sm font-semibold text-sidebar-foreground">My Loan Portal</div>
        </div>

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}

        <div className="mt-auto flex flex-col gap-2 border-t border-sidebar-border pt-4">
          <div className="truncate px-2 text-xs text-muted-foreground">
            {loan.name}
          </div>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={async () => {
              await logout();
              router.push("/portal/login");
            }}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden p-6">{children}</main>

      {!loan.terms_accepted_at && (
        <TermsModal loan={loan} onAccepted={(updated) => setLoan(updated)} />
      )}
    </div>
  );
}
