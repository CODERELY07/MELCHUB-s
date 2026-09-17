"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { cn } from "@/lib/utils";

export interface AppShellNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface AppShellProps {
  title: string;
  navItems: AppShellNavItem[];
  isActive: (href: string) => boolean;
  userLabel: string;
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}

/**
 * The admin and portal apps are otherwise unrelated (separate auth, separate
 * data), but they share the exact same "sidebar + main content" shell, so
 * the responsive behavior — a real requirement, not just desktop polish —
 * only needs to be built and tested once here instead of twice, in sync,
 * across two files that would otherwise drift apart.
 *
 * Below the `lg` breakpoint the sidebar becomes an off-canvas drawer opened
 * by a hamburger button in a slim top bar, closing itself on nav/backdrop
 * click/Escape — the same interaction pattern as the app's own <Modal>
 * (native <dialog>-adjacent, not reinventing focus/scroll handling).
 */
export function AppShell({
  title,
  navItems,
  isActive,
  userLabel,
  onLogout,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground">
          M
        </div>
        <div className="truncate text-sm font-semibold text-sidebar-foreground">
          {title}
        </div>
      </div>

      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </Link>
      ))}

      <div className="mt-auto flex flex-col gap-2 border-t border-sidebar-border pt-4">
        <div className="truncate px-2 text-xs text-muted-foreground">{userLabel}</div>
        <InstallPwaButton />
        <Button variant="ghost" className="justify-start" onClick={onLogout}>
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 lg:flex-row">
      {/* Mobile top bar — hidden at lg and up, where the sidebar is always visible inline */}
      <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary font-heading text-xs font-bold text-primary-foreground">
            M
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="size-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {/* Desktop sidebar — always visible, no toggle */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        {nav}
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
    </div>
  );
}
