"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, TriangleAlert, Wallet2 } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { cachedGet } from "@/lib/offline-cache";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, todayInManila } from "@/lib/format";
import type { Loan, LoanDefaultsSettings } from "@/lib/types";

/** Whole days from today (Philippine calendar date) to `iso` — negative once it's passed. */
function daysUntil(iso: string): number {
  const target = new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime();
  const today = new Date(`${todayInManila()}T00:00:00Z`).getTime();

  return Math.round((target - today) / 86400000);
}

function dueLabel(days: number): string {
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days > 1) return `due in ${days} days`;

  return `${Math.abs(days)} day${days === -1 ? "" : "s"} late`;
}

/**
 * The one thing a borrower on an installment plan most needs to know: how
 * much to pay, by when, and what happens if they don't. The amount comes
 * straight from the server (Loan::amount_due_this_week) so it always matches
 * what the late-fee check will judge them against — never recalculated here.
 */
export function NextPaymentCard({ loan, onPay }: { loan: Loan; onPay: () => void }) {
  const [lateFee, setLateFee] = useState<number | null>(null);

  useEffect(() => {
    cachedGet("loan-defaults", () =>
      borrowerApi.get("/settings/loan-defaults").then((res) => res.data as LoanDefaultsSettings)
    )
      .then((d) => setLateFee(Number(d.late_fee_amount)))
      .catch(() => setLateFee(null));
  }, []);

  if (!loan.due_date) return null;

  const days = daysUntil(loan.due_date);
  const amount = loan.amount_due_this_week;
  const pastDue = loan.past_due_amount;
  const paidUp = amount <= 0;
  const autoFee = loan.installments_enabled && loan.auto_penalty && lateFee !== null && lateFee > 0;
  const periodWord = loan.plan_period_days === 7 ? "week" : `${loan.plan_period_days} days`;

  return (
    <Card
      className={cn(
        "border-l-4",
        pastDue > 0 ? "border-l-destructive" : paidUp ? "border-l-success" : "border-l-primary"
      )}
    >
      <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
              pastDue > 0 ? "bg-destructive/10 text-destructive" : paidUp ? "bg-success/15 text-success-ink" : "bg-primary/10 text-primary"
            )}
          >
            {pastDue > 0 ? <TriangleAlert className="size-4.5" /> : paidUp ? <CheckCircle2 className="size-4.5" /> : <Wallet2 className="size-4.5" />}
          </span>

          <div className="space-y-1">
            {paidUp ? (
              <>
                <div className="text-lg font-semibold">You&apos;re paid up for this {loan.installments_enabled ? periodWord : "loan"}</div>
                <p className="text-sm text-muted-foreground">
                  {loan.installments_enabled
                    ? `Next payment is due ${formatDate(loan.due_date)} (${dueLabel(days)}).`
                    : `Nothing is due right now.`}
                </p>
              </>
            ) : (
              <>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {pastDue > 0 ? "Payment behind" : loan.installments_enabled ? `Pay for this ${periodWord}` : "Amount due"}
                </div>
                <div className="text-3xl font-bold tracking-tight">{formatCurrency(amount)}</div>
                <p className="text-sm text-muted-foreground">
                  By <strong className="text-foreground">{formatDate(loan.due_date)}</strong> ({dueLabel(days)})
                  {pastDue > 0 && <> — includes {formatCurrency(pastDue)} that was already due</>}
                </p>
              </>
            )}

            {autoFee && !paidUp && (
              <p className="text-xs text-muted-foreground">
                A {formatCurrency(lateFee)} late fee is added automatically if this isn&apos;t paid by then.
              </p>
            )}
            {Number(loan.penalty_amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                Late fees charged so far: {formatCurrency(loan.penalty_amount)}
              </p>
            )}
          </div>
        </div>

        <Button className="w-full sm:w-auto" variant={paidUp ? "outline" : "default"} onClick={onPay}>
          <Wallet2 className="size-4" />
          {paidUp ? "Pay anyway" : "Pay now"}
        </Button>
      </CardContent>
    </Card>
  );
}
