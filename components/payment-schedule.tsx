"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { installmentSchedule, type InstallmentStatus } from "@/lib/installment-schedule";
import { cn } from "@/lib/utils";
import type { Loan } from "@/lib/types";

const STATUS_BADGE: Record<InstallmentStatus, "success" | "destructive" | "default" | "muted"> = {
  paid: "success",
  late: "destructive",
  next: "default",
  upcoming: "muted",
};

/**
 * Every payment of an installment loan in one list: when it's due, how
 * much, and whether it's done — so a borrower can see the whole plan, not
 * just the next payment.
 */
export function PaymentSchedule({ loan }: { loan: Loan }) {
  const { t } = useI18n();
  const rows = installmentSchedule(loan);
  if (rows.length === 0) return null;

  const period = loan.plan_period_days === 7 ? t("schedule.week") : t("schedule.days", { days: loan.plan_period_days });
  const share = Math.round(100 / Math.max(1, loan.plan_installments));

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">{t("schedule.title")}</CardTitle>
        <CardDescription>
          {t("schedule.desc", {
            count: rows.length,
            amount: formatCurrency(loan.installment_amount),
            period,
            share,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <li
              key={row.n}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 text-sm",
                row.status === "next" && "bg-primary/5"
              )}
            >
              <div>
                <div className="font-medium">{t("schedule.number", { n: row.n })}</div>
                <div className="text-xs text-muted-foreground">{formatDate(row.due)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-semibold tabular-nums">{formatCurrency(row.amount)}</span>
                <Badge variant={STATUS_BADGE[row.status]}>{t(`schedule.${row.status}`)}</Badge>
                {row.status !== "paid" && row.remaining < row.amount && (
                  <span className="text-xs text-muted-foreground">
                    {t("schedule.partly", { amount: formatCurrency(row.remaining) })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">{t("schedule.remainder")}</p>
      </CardContent>
    </Card>
  );
}
