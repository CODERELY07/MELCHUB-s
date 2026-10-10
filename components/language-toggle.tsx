"use client";

import { Languages } from "lucide-react";

import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * English / Tagalog switch. Both choices are always visible (a two-way
 * segmented control, not a single button that flips) so someone who reads
 * only one of the two languages can still find theirs without guessing.
 */
export function LanguageToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const options: { value: Lang; label: string; short: string }[] = [
    { value: "en", label: t("lang.en"), short: "EN" },
    { value: "tl", label: t("lang.tl"), short: "TL" },
  ];

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={cn("flex items-center gap-1.5", !compact && "px-2", className)}
    >
      {!compact && <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <div className="flex flex-1 rounded-lg bg-muted p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setLang(option.value)}
            aria-pressed={lang === option.value}
            aria-label={option.label}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              lang === option.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {compact ? option.short : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
