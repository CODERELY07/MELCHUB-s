"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { LogOut, MoreHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { OfflineBanner } from "@/components/offline-banner";
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

// A phone-width tab bar only has room for four destinations plus an
// always-present "More" tab — mirrors the iOS/Android convention of
// collapsing the rest of a longer nav into one overflow tab rather than
// shrinking every icon to fit.
const MAX_PRIMARY_TABS = 4;

/**
 * The admin and portal apps are otherwise unrelated (separate auth, separate
 * data), but they share the exact same shell, so the responsive behavior —
 * a real requirement, not just desktop polish — only needs to be built and
 * tested once here instead of twice, in sync, across two files that would
 * otherwise drift apart.
 *
 * Desktop (`lg` and up) keeps the classic sidebar. Below `lg` the app
 * switches to the pattern users actually expect from an installed phone
 * app: a fixed bottom tab bar for primary navigation instead of a
 * hamburger drawer, with any nav items beyond the first four — plus
 * account actions (theme, install, log out) that have no other home on
 * mobile — collapsed into a bottom sheet behind the tab bar's "More" tab.
 */
export function AppShell({
  title,
  navItems,
  isActive,
  userLabel,
  onLogout,
  children,
}: AppShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTabRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const primaryItems = navItems.slice(0, MAX_PRIMARY_TABS);
  const overflowItems = navItems.slice(MAX_PRIMARY_TABS);
  const overflowActive = overflowItems.some((item) => isActive(item.href));

  const closeSheet = () => {
    setMoreOpen(false);
    moreTabRef.current?.focus();
  };

  // The sheet is a plain <div>, not <dialog>, so none of this comes free —
  // Escape-to-close and keeping focus off the page underneath have to be
  // wired up by hand instead of inherited from the platform the way <Modal>
  // gets them.
  useEffect(() => {
    if (!moreOpen) return;

    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  const nav = (
    <>
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),var(--chart-5)_30%)] font-heading text-sm font-bold text-primary-foreground">
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
        <ThemeToggle />
        <Button variant="ghost" className="justify-start" onClick={onLogout}>
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 lg:flex-row">
      {/* Mobile app bar — hidden at lg and up, where the sidebar is always visible inline */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-sidebar-border bg-sidebar/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm lg:hidden"
        inert={moreOpen}
      >
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),var(--chart-5)_30%)] font-heading text-xs font-bold text-primary-foreground">
          M
        </div>
        <span className="truncate text-sm font-semibold text-sidebar-foreground">{title}</span>
      </div>

      {/* "More" bottom sheet + backdrop — collapses overflow nav items and account actions */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More"
        >
          <div
            className="absolute inset-0 animate-in bg-black/50 fade-in-0"
            onClick={closeSheet}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[80vh] animate-in flex-col gap-1 overflow-y-auto rounded-t-2xl border-t border-sidebar-border bg-sidebar p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl slide-in-from-bottom duration-300"
          >
            <div className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-sidebar-accent" aria-hidden="true" />

            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">More</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSheet}
                aria-label="Close menu"
                className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            {overflowItems.length > 0 && (
              <div className="flex flex-col gap-1 border-b border-sidebar-border pb-3">
                {overflowItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSheet}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-3">
              <div className="truncate px-2 text-xs text-muted-foreground">{userLabel}</div>
              <InstallPwaButton />
              <ThemeToggle />
              <Button variant="ghost" className="justify-start" onClick={onLogout}>
                <LogOut className="size-4" />
                Log out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — always visible, no toggle */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        {nav}
      </aside>

      <main
        className="flex min-w-0 flex-1 flex-col overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6"
        inert={moreOpen}
      >
        <OfflineBanner />
        <div className="p-4 sm:p-6">{children}</div>
      </main>

      {/* Mobile bottom tab bar — the app's primary navigation below lg */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-sidebar-border bg-sidebar/95 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
        style={{ gridTemplateColumns: `repeat(${primaryItems.length + 1}, minmax(0, 1fr))` }}
        inert={moreOpen}
      >
        {primaryItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-1 pt-2 pb-1 text-[11px] font-medium text-sidebar-foreground/60"
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-lg px-3.5 py-1 transition-colors",
                  active && "bg-primary/10"
                )}
              >
                <item.icon className={cn("size-5", active && "text-primary")} />
              </span>
              <span className={cn("truncate", active && "font-semibold text-primary")}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          ref={moreTabRef}
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 px-1 pt-2 pb-1 text-[11px] font-medium text-sidebar-foreground/60"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-lg px-3.5 py-1 transition-colors",
              overflowActive && "bg-primary/10"
            )}
          >
            <MoreHorizontal className={cn("size-5", overflowActive && "text-primary")} />
          </span>
          <span className={cn("truncate", overflowActive && "font-semibold text-primary")}>
            More
          </span>
        </button>
      </nav>
    </div>
  );
}
