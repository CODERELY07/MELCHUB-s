import { cn } from "@/lib/utils";

// Written out in full (not built from a template string) so Tailwind's
// static scanner can see every class it needs to generate — see the same
// note in stat-card.tsx. `text-data-N`, not `text-chart-N`: initials are
// real text (4.5:1 required), and the raw chart tokens measured as low as
// 2.2:1 against this tint in light mode — see stat-card.tsx's note.
const PALETTE = [
  "bg-chart-1/15 text-data-1",
  "bg-chart-2/15 text-data-2",
  "bg-chart-3/15 text-data-3",
  "bg-chart-4/15 text-data-4",
  "bg-chart-5/15 text-data-5",
] as const;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  className?: string;
}

/**
 * A deterministic-color initials avatar — the same borrower always lands
 * on the same tone, computed from their name rather than stored anywhere,
 * so it stays in sync with zero backend changes.
 */
export function Avatar({ name, className }: AvatarProps) {
  const palette = PALETTE[hashName(name) % PALETTE.length];

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        palette,
        className
      )}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
