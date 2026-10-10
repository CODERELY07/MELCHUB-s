"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Banknote, HandCoins, Landmark, TriangleAlert, Users } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import { LOGIN_PATH } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { CashAccount, LendingBudgetSettings, Loan } from "@/lib/types";

/**
 * The owner's "how is the business doing" page. Every peso figure covers
 * ACTIVE loans only — a paid-off loan's interest is already money in hand,
 * so counting it again here would double it. Each tile says so in its hint.
 */
export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [remainingBudget, setRemainingBudget] = useState<{ remaining: number | null } | null>(null);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    api
      .get("/loans")
      .then((res) => setLoans(res.data))
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push(LOGIN_PATH);
          return;
        }
        setLoadFailed(true);
      });

    // Admin-only endpoints — a 403 for other staff just means those parts aren't shown.
    api
      .get("/settings/lending-budget")
      .then((res) => setRemainingBudget({ remaining: (res.data as LendingBudgetSettings).remaining_budget }))
      .catch(() => setRemainingBudget(null));

    api
      .get("/cash-accounts")
      .then((res) => setCashAccounts(res.data))
      .catch(() => setCashAccounts(null));
  }, [router]);

  if (loadFailed) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{t("dash.loadError")}</AlertDescription>
      </Alert>
    );
  }

  if (!loans) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Only loans still running — paid, cancelled and defaulted loans are finished.
  const running = loans.filter((l) => !["paid", "cancelled", "defaulted"].includes(l.status));
  const peoplePaying = new Set(running.map((l) => l.borrower_id)).size;
  // Principal still out: payments reduce it, interest and fees don't add to it.
  const lentOut = running.reduce((sum, l) => sum + Math.max(0, Number(l.total_loan) - Number(l.total_paid)), 0);
  const collected = running.reduce((sum, l) => sum + Number(l.total_paid), 0);
  const stillToCollect = running.reduce((sum, l) => sum + Math.max(0, Number(l.balance)), 0);
  // What's left after the principal: interest and late fees not yet paid, on active loans only.
  const interestToCollect = Math.max(0, stillToCollect - lentOut);
  const lateCount = running.filter((l) => l.is_overdue).length;
  const cash = (cashAccounts ?? []).reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.dashboard")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dash.subtitle")}</p>
      </header>

      {lateCount > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {lateCount === 1 ? t("dash.lateOne") : t("dash.lateMany", { count: lateCount })}
            <Link href="/admin/loans" className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
              {t("dash.seeLoans")}
              <ArrowRight className="size-3.5" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("dash.people")} value={String(peoplePaying)} hint={t("dash.peopleHint")} icon={Users} tone={1} />
        <StatCard label={t("dash.lentOut")} value={formatCurrency(lentOut)} hint={t("dash.lentOutHint")} icon={HandCoins} tone={2} />
        <StatCard label={t("dash.collected")} value={formatCurrency(collected)} hint={t("dash.collectedHint")} icon={Banknote} tone={3} />
        <StatCard
          label={t("dash.toCollect")}
          value={formatCurrency(stillToCollect)}
          hint={t("dash.toCollectHint")}
          icon={AlertCircle}
          tone={4}
        />
      </div>

      {(cashAccounts !== null || remainingBudget !== null) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cashAccounts !== null && (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="text-base">{t("dash.moneyTitle")}</CardTitle>
                <CardDescription>{t("dash.moneyDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border text-sm">
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt>
                      {t("dash.moneyCash")}
                      <span className="block text-xs text-muted-foreground">{t("dash.moneyCashHint")}</span>
                    </dt>
                    <dd className="font-medium tabular-nums">{formatCurrency(cash)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt>
                      {t("dash.moneyLent")}
                      <span className="block text-xs text-muted-foreground">{t("dash.moneyLentHint")}</span>
                    </dt>
                    <dd className="font-medium tabular-nums">{formatCurrency(lentOut)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2 font-semibold">
                    <dt>{t("dash.moneyOnHand")}</dt>
                    <dd className="tabular-nums">{formatCurrency(cash + lentOut)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt>
                      {t("dash.moneyInterest")}
                      <span className="block text-xs text-muted-foreground">{t("dash.moneyInterestHint")}</span>
                    </dt>
                    <dd className="font-medium tabular-nums text-success-ink">+ {formatCurrency(interestToCollect)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2 text-base font-bold">
                    <dt>{t("dash.moneyTotal")}</dt>
                    <dd className="tabular-nums">{formatCurrency(cash + lentOut + interestToCollect)}</dd>
                  </div>
                </dl>
                {cashAccounts.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("dash.moneyNoAccounts")}{" "}
                    <Link href="/admin/settings" className="font-medium text-primary underline underline-offset-2">
                      {t("nav.settings")}
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {remainingBudget !== null && (
            <Card>
              <CardHeader className="!flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-5/15 text-data-5">
                  <Landmark className="size-5" />
                </span>
                <div>
                  <CardTitle as="h2" className="text-base">{t("dash.budgetTitle")}</CardTitle>
                  <CardDescription>{t("dash.budgetDesc")}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {remainingBudget.remaining !== null ? formatCurrency(remainingBudget.remaining) : t("dash.budgetNotSet")}
                </div>
                {remainingBudget.remaining === null && (
                  <Link href="/admin/settings" className="text-sm font-medium text-primary underline underline-offset-2">
                    {t("dash.budgetSet")}
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
