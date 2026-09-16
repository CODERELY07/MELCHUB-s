"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, UserRound, LogOut, Loader2 } from "lucide-react";

import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/portal", label: "My Loan", icon: LayoutDashboard },
  { href: "/portal/profile", label: "Profile", icon: UserRound },
];

export default function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loan, loading, logout } = useBorrowerAuth();
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
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-muted/30 p-4">
        <div className="mb-4 px-2 text-sm font-semibold">My Loan Portal</div>

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
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
    </div>
  );
}
