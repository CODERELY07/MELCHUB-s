"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft, HandCoins, PiggyBank, TrendingUp, Wallet, Wallet2 } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { LOGIN_PATH } from "@/lib/auth-context";
import { cachedGet } from "@/lib/offline-cache";
import { projectedPayoff } from "@/lib/loan-payoff";
import { useI18n } from "@/lib/i18n";
import { LoanHistoryTable } from "@/components/loan-history-table";
import { LoanStatusBadge } from "@/components/loan-status-badge";
import { NextPaymentCard } from "@/components/next-payment-card";
import { PaymentSchedule } from "@/components/payment-schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, toDateInputValue, todayInManila } from "@/lib/format";
import type { Loan, LoanHistoryEntry, LoanStatus } from "@/lib/types";

const CLOSED_STATUSES: LoanStatus[] = ["paid", "cancelled", "defaulted"];

/**
 * One loan, top to bottom in the order a borrower asks about it: what do I
 * pay next → where does this loan stand → how was it set up → what happened
 * day by day.
 */
export default function PortalLoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [history, setHistory] = useState<LoanHistoryEntry[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [payoffDate, setPayoffDate] = useState("");

  useEffect(() => {
    cachedGet(`loan-${id}`, () => borrowerApi.get(`/borrower/loans/${id}`).then((res) => res.data as Loan))
      .then((data) => {
        setLoan(data);
        setPayoffDate((current) => current || toDateInputValue(data.due_date));
      })
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("borrower_token");
          router.push(LOGIN_PATH);
          return;
        }
        setLoadFailed(true);
      });

    cachedGet(`loan-${id}-history`, () =>
      borrowerApi.get(`/borrower/loans/${id}/history`).then((res) => res.data as LoanHistoryEntry[])
    )
      .then(setHistory)
      .catch(() => {
        // Non-critical — the loan's own numbers above still load fine.
      });
  }, [id, router]);

  const backLink = (
    <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      {t("loan.back")}
    </Link>
  );

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <Alert variant="destructive">
          <AlertDescription>{t("loan.loadError")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const isOpen = !CLOSED_STATUSES.includes(loan.status);
  const goPay = () => router.push(`/portal/loans/${loan.id}/pay`);
  const usesWeeklySchedule = loan.installments_enabled && loan.auto_penalty;
  const canPlanPayoff = isOpen && !!loan.due_date && !loan.is_overdue;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {backLink}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("loan.title", { number: loan.loan_number ?? "" })}
          </h1>
          <LoanStatusBadge loan={loan} />
        </div>
        {isOpen && !loan.due_date && (
          <Button onClick={goPay}>
            <Wallet2 className="size-4" />
            {t("next.payNow")}
          </Button>
        )}
      </div>

      {isOpen && loan.due_date && <NextPaymentCard loan={loan} onPay={goPay} />}

      {isOpen && <PaymentSchedule loan={loan} />}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t("stat.borrowed")}
          value={formatCurrency(loan.total_loan)}
          hint={t("stat.borrowedHint")}
          icon={Wallet}
          tone={1}
        />
        <StatCard
          label={t("stat.interest")}
          value={formatCurrency(loan.interest_amount)}
          hint={t(loan.compounds_interest ? "stat.interestHintCompound" : "stat.interestHint", { rate: Number(loan.interest_rate) })}
          icon={TrendingUp}
          tone={4}
        />
        <StatCard
          label={t("stat.paid")}
          value={formatCurrency(loan.total_paid)}
          hint={t("stat.paidHint")}
          icon={HandCoins}
          tone={3}
        />
        <StatCard
          label={t("stat.owed")}
          value={formatCurrency(Math.max(0, loan.balance))}
          hint={t("stat.owedHint")}
          icon={PiggyBank}
          tone={2}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-base">{t("loan.aboutTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t("loan.started")}</dt>
              <dd className="font-medium">{formatDate(loan.start_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{usesWeeklySchedule ? t("loan.nextDue") : t("loan.dueDate")}</dt>
              <dd className="font-medium">{formatDate(loan.due_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("loan.plan")}</dt>
              <dd className="font-medium">
                {loan.installments_enabled ? (loan.plan_name ?? t("loan.installments")) : t("loan.oneTime")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("loan.rate")}</dt>
              <dd className="font-medium">
                {t(loan.compounds_interest ? "loan.rateCompound" : "loan.rateValue", { rate: Number(loan.interest_rate) })}
              </dd>
            </div>
            {Number(loan.penalty_amount) > 0 && (
              <div>
                <dt className="text-muted-foreground">{t("loan.lateFees")}</dt>
                <dd className="font-medium text-destructive">{formatCurrency(loan.penalty_amount)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {canPlanPayoff && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">{t("loan.payoffTitle")}</CardTitle>
            <CardDescription>{t("loan.payoffDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
            <div className="space-y-1.5 sm:w-56">
              <Label htmlFor="payoff_date">{t("loan.payoffPayOn")}</Label>
              <Input
                id="payoff_date"
                type="date"
                min={todayInManila()}
                max={toDateInputValue(loan.due_date)}
                value={payoffDate}
                onChange={(e) => setPayoffDate(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("loan.payoffTotal", { date: formatDate(payoffDate) })}</div>
              <div className="text-2xl font-bold tabular-nums">
                {payoffDate ? formatCurrency(projectedPayoff(loan, payoffDate)) : "—"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-lg font-semibold">{t("history.title")}</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">{t("history.subtitle")}</p>
        {!history ? <Skeleton className="h-40 w-full rounded-lg" /> : <LoanHistoryTable entries={history} />}
      </section>
    </div>
  );
}
