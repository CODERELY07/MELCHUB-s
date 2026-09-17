"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  BarChart3,
  ReceiptText,
  Settings,
  Loader2,
} from "lucide-react";

import { useAuth, ADMIN_LOGIN_PATH } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";

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
      router.replace(ADMIN_LOGIN_PATH);
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
        <Button
          onClick={async () => {
            await logout();
            router.push(ADMIN_LOGIN_PATH);
          }}
        >
          Log out
        </Button>
      </div>
    );
  }

  return (
    <AppShell
      title="MELCHUB Admin"
      navItems={NAV_ITEMS}
      isActive={(href) => pathname?.startsWith(href) ?? false}
      userLabel={user.username}
      onLogout={async () => {
        await logout();
        router.push(ADMIN_LOGIN_PATH);
      }}
    >
      {children}
    </AppShell>
  );
}
