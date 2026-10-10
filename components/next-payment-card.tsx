"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, TriangleAlert, Wallet2 } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { cachedGet } from "@/lib/offline-cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, todayInManila } from "@/lib/format";
import type { Loan, LoanDefaultsSettings } from "@/lib/types";

/** Whole days from today (Philippine calendar date) to `iso` — negative once it's passed. */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime();
  const today = new Date(`${todayInManila()}T00:00:00Z`).getTime();

  return Math.round((target - today) / 86400000);
}

/** The admin's late fee (Settings), or null if it can't be loaded. Cached for offline use. */
export function useLateFee(): number | null {
  const [lateFee, setLateFee] = useState<number | null>(null);

  useEffect(() => {
    cachedGet("loan-defaults", () =>
      borrowerApi.get("/settings/loan-defaults").then((res) => res.data as LoanDefaultsSettings)
    )
      .then((d) => setLateFee(Number(d.late_fee_amount)))
      .catch(() => setLateFee(null));
  }, []);

  return lateFee;
}

/**
 * The one thing a borrower most needs to know, said as a single sentence:
 * "Pay ₱912.00 by Oct 15." The amount comes straight from the server
 * (Loan::amount_due_this_week) so it always matches what the late-fee check
 * judges them against — never recalculated here.
 */
export function NextPaymentCard({ loan, onPay }: { loan: Loan; onPay: () => void }) {
  const { t, rich } = useI18n();
  const lateFee = useLateFee();

  if (!loan.due_date) return null;

  const days = daysUntil(loan.due_date);
  const amount = loan.amount_due_this_week;
  const pastDue = loan.past_due_amount;
  const paidUp = amount <= 0;
  const behind = pastDue > 0;
  const autoFee = loan.installments_enabled && loan.auto_penalty && lateFee !== null && lateFee > 0;
  const date = formatDate(loan.due_date);

  const chip =
    days === 0
      ? t("next.today")
      : days === 1
        ? t("next.tomorrow")
        : days > 1
          ? t("next.inDays", { days })
          : days === -1
            ? t("next.lateOne")
            : t("next.lateMany", { days: Math.abs(days) });

  const amountNode = <span className="whitespace-nowrap tabular-nums">{formatCurrency(amount)}</span>;

  return (
    <Card className={cn(behind && "bg-destructive/5 ring-destructive/20", paidUp && "bg-success/5 ring-success/20")}>
      <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
              behind ? "bg-destructive/10 text-destructive" : paidUp ? "bg-success/15 text-success-ink" : "bg-primary/10 text-primary"
            )}
            aria-hidden="true"
          >
            {behind ? <TriangleAlert className="size-5" /> : paidUp ? <CheckCircle2 className="size-5" /> : <Wallet2 className="size-5" />}
          </span>

          <div className="space-y-1.5">
            {paidUp ? (
              <>
                <h2 className="text-lg font-semibold">{t("next.paidUpHeading")}</h2>
                <p className="text-sm text-muted-foreground">{t("next.paidUpBody", { date })}</p>
              </>
            ) : behind ? (
              <>
                <h2 className="text-lg font-semibold">{t("next.behindHeading")}</h2>
                <p className="text-sm">
                  {rich("next.behindBody", {
                    amount: <strong className="text-base">{amountNode}</strong>,
                    date: <strong>{date}</strong>,
                    pastDue: <strong className="whitespace-nowrap">{formatCurrency(pastDue)}</strong>,
                  })}
                </p>
              </>
            ) : (
              <h2 className="text-lg font-semibold leading-snug">
                {rich("next.payBy", {
                  amount: <span className="text-2xl font-bold">{amountNode}</span>,
                  date,
                })}
              </h2>
            )}

            {!paidUp && <Badge variant={days < 0 ? "destructive" : days <= 1 ? "warning" : "muted"}>{chip}</Badge>}

            {autoFee && !paidUp && (
              <p className="text-xs text-muted-foreground">
                {t("next.lateFeeWarning", { fee: formatCurrency(lateFee) })}
              </p>
            )}
            {Number(loan.penalty_amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("next.feesSoFar", { amount: formatCurrency(loan.penalty_amount) })}
              </p>
            )}
          </div>
        </div>

        <Button className="w-full sm:w-auto" size="lg" variant={paidUp ? "outline" : "default"} onClick={onPay}>
          <Wallet2 className="size-4" />
          {paidUp ? t("next.payEarly") : t("next.payNow")}
        </Button>
      </CardContent>
    </Card>
  );
}
