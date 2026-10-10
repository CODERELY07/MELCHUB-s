"use client";

import { useState } from "react";

import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LoanHistoryEntry } from "@/lib/types";

type Filter = "all" | LoanHistoryEntry["type"];

/**
 * A loan's day-by-day record: interest added, payments made, late fees.
 * Shared by the borrower's loan page and the admin's History window. Each
 * row says in words what happened, so nobody has to decode a "+"/"−" sign.
 * Newest first, with filters — one interest row per day otherwise buries
 * the few payments and late fees people actually come here to find.
 */
export function LoanHistoryTable({
  entries,
  onRemovePenalty,
}: {
  entries: LoanHistoryEntry[];
  /** Admin only — when given, each late-fee row gets a Remove button. */
  onRemovePenalty?: (entry: LoanHistoryEntry) => void;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: entries.length,
    interest: entries.filter((e) => e.type === "interest").length,
    payment: entries.filter((e) => e.type === "payment").length,
    penalty: entries.filter((e) => e.type === "penalty").length,
  };
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("history.filterAll") },
    { value: "payment", label: t("history.filterPayments") },
    { value: "penalty", label: t("history.filterFees") },
    { value: "interest", label: t("history.filterInterest") },
  ];
  const shown = entries.filter((e) => filter === "all" || e.type === filter).slice().reverse();

  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("history.empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("history.title")}>
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
              filter === option.value
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:text-foreground"
            )}
          >
            {option.label} ({counts[option.value]})
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{t("history.newestFirst")}</span>
      </div>

    <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{t("history.date")}</th>
            <th className="px-3 py-2 font-medium">{t("history.what")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("history.amount")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {shown.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t("history.empty")}
              </td>
            </tr>
          )}
          {shown.map((entry, i) => (
            <tr key={i}>
              <td className="whitespace-nowrap px-3 py-2 align-top">{formatDate(entry.date)}</td>
              <td className="px-3 py-2">
                {entry.type === "interest" ? (
                  <div>
                    <span>{t("history.interestDay", { day: entry.day ?? shown.length - i })}</span>
                    {entry.balance !== undefined && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t("history.balanceAfter", { amount: formatCurrency(entry.balance) })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Badge variant={entry.type === "payment" ? "success" : "destructive"}>
                      {entry.type === "payment" ? t("history.payment") : t("history.lateFee")}
                    </Badge>
                    {entry.note && <div className="mt-1 text-xs text-muted-foreground">{entry.note}</div>}
                    {entry.recorded_by && (
                      <div className="text-xs text-muted-foreground">
                        {t("history.recordedBy", { name: entry.recorded_by })}
                      </div>
                    )}
                    {onRemovePenalty && entry.type === "penalty" && entry.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="mt-1 h-auto px-1 text-xs text-destructive"
                        onClick={() => onRemovePenalty(entry)}
                      >
                        {t("history.removeFee")}
                      </Button>
                    )}
                  </div>
                )}
              </td>
              <td
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-right align-top font-medium tabular-nums",
                  entry.type === "payment" ? "text-success-ink" : entry.type === "penalty" ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {entry.type === "payment" ? "−" : "+"}
                {formatCurrency(entry.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
