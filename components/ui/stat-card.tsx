import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type StatTone = 1 | 2 | 3 | 4 | 5;

// One literal class string per chart token, written out in full so
// Tailwind's static scanner can see every utility it needs to generate —
// building these with template interpolation (e.g. `bg-chart-${n}/12`)
// would never appear in the source text and would silently ship unstyled.
//
// The icon uses `text-data-N`, not `text-chart-N` — same hue, but calibrated
// darker so it clears 4.5:1 against the tinted badge in light mode (the raw
// chart tokens are tuned for chart legibility, not text-on-tint contrast;
// `chart-2`/`chart-3` measured 2.2–2.8:1 there). Dark mode's `data-N` is
// identical to `chart-N`, which already measures 4.6:1+.
const TONE_STYLES: Record<StatTone, { tile: string; badge: string; icon: string }> = {
  1: {
    tile: "bg-gradient-to-br from-chart-1/12 via-chart-1/5 to-transparent ring-chart-1/15",
    badge: "bg-chart-1/15",
    icon: "text-data-1",
  },
  2: {
    tile: "bg-gradient-to-br from-chart-2/12 via-chart-2/5 to-transparent ring-chart-2/15",
    badge: "bg-chart-2/15",
    icon: "text-data-2",
  },
  3: {
    tile: "bg-gradient-to-br from-chart-3/12 via-chart-3/5 to-transparent ring-chart-3/15",
    badge: "bg-chart-3/15",
    icon: "text-data-3",
  },
  4: {
    tile: "bg-gradient-to-br from-chart-4/12 via-chart-4/5 to-transparent ring-chart-4/15",
    badge: "bg-chart-4/15",
    icon: "text-data-4",
  },
  5: {
    tile: "bg-gradient-to-br from-chart-5/12 via-chart-5/5 to-transparent ring-chart-5/15",
    badge: "bg-chart-5/15",
    icon: "text-data-5",
  },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: StatTone;
  className?: string;
}

/**
 * The colorful metric tile shared by the admin dashboard, analytics, and
 * borrower portal home — a gradient-tinted card in one of the five chart
 * tones (DESIGN.md's "Data Color Roles") with a round, tinted icon badge,
 * replacing the flat white card + square icon chip these three pages used
 * to repeat individually.
 */
export function StatCard({ label, value, icon: Icon, tone, className }: StatCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-3.5 ring-1 shadow-[0_1px_2px_-1px_var(--shadow-color),0_12px_28px_-14px_var(--shadow-color)] sm:p-5",
        styles.tile,
        className
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10",
          styles.badge,
          styles.icon
        )}
      >
        <Icon className="size-4 sm:size-[1.125rem]" />
      </span>

      <div className="mt-3 truncate text-xs font-medium text-muted-foreground sm:text-sm">
        {label}
      </div>
      <div className="text-lg font-bold tracking-tight sm:text-2xl">{value}</div>
    </div>
  );
}
