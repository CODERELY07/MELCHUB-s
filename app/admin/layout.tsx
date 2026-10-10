"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  BarChart3,
  ReceiptText,
  Settings,
  UserPlus,
  FileCheck2,
  Loader2,
} from "lucide-react";

import { useAuth, LOGIN_PATH } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

// Ordered by how often the owner reaches for each one — the first four
// become the phone's bottom tabs, the rest go under "More".
const NAV_ITEMS: { href: string; labelKey: MessageKey; icon: typeof LayoutDashboard }[] = [
  { href: "/admin/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/admin/loans", labelKey: "nav.loans", icon: Landmark },
  { href: "/admin/payment-proofs", labelKey: "nav.receipts", icon: ReceiptText },
  { href: "/admin/loan-requests", labelKey: "nav.loanRequests", icon: FileCheck2 },
  { href: "/admin/clients/new", labelKey: "nav.addClient", icon: UserPlus },
  { href: "/admin/analytics", labelKey: "nav.reports", icon: BarChart3 },
  { href: "/admin/settings", labelKey: "nav.settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(LOGIN_PATH);
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
        <h1 className="text-xl font-semibold">{t("admin.noAccessTitle")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("admin.noAccessBody", { name: user.username })}
        </p>
        <Button
          onClick={async () => {
            await logout();
            router.push(LOGIN_PATH);
          }}
        >
          {t("shell.logOut")}
        </Button>
      </div>
    );
  }

  return (
    <AppShell
      title={t("nav.adminTitle")}
      navItems={NAV_ITEMS.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }))}
      isActive={(href) => pathname?.startsWith(href) ?? false}
      userLabel={user.username}
      onLogout={async () => {
        await logout();
        router.push(LOGIN_PATH);
      }}
    >
      {children}
    </AppShell>
  );
}
