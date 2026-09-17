"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Landmark,
  BarChart3,
  ReceiptText,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/loans", label: "Loans", icon: Landmark },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/payment-proofs", label: "Payment Proofs", icon: ReceiptText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">You don&apos;t have access to this page</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This area is restricted to admin accounts. You&apos;re signed in as{" "}
          {user.username}.
        </p>
        <Button onClick={() => router.push("/")}>Back to home</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground">
            M
          </div>
          <div className="text-sm font-semibold text-sidebar-foreground">MELCHUB Admin</div>
        </div>

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              pathname?.startsWith(item.href)
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
            {user.username}
          </div>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={async () => {
              await logout();
              router.push("/login");
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
