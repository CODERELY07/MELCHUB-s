"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ChevronDown, ChevronRight, FilePlus2, Wallet2 } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { LOGIN_PATH } from "@/lib/auth-context";
import { cachedGet } from "@/lib/offline-cache";
import { combinedPayoff, latestProjectableDueDate } from "@/lib/loan-payoff";
import { payableLoans } from "@/lib/allocate-payment";
import { useI18n } from "@/lib/i18n";
import { LoanRequestModal } from "@/components/loan-request-modal";
import { LoanStatusBadge } from "@/components/loan-status-badge";
import { daysUntil } from "@/components/next-payment-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, todayInManila } from "@/lib/format";
import type { Loan, LoanRequest, LoanStatus } from "@/lib/types";

const CLOSED: LoanStatus[] = ["paid", "cancelled", "defaulted"];

/**
 * The borrower's home: what they owe and when, loan by loan, before
 * anything else. Borrowing more and planning ahead come after, because
 * paying on time is the thing that costs them money if they miss it.
 */
export default function PortalHomePage() {
  const { borrower } = useBorrowerAuth();
  const { t, rich } = useI18n();
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [latestRequest, setLatestRequest] = useState<LoanRequest | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [payoffDate, setPayoffDate] = useState(() => todayInManila());
  const router = useRouter();

  useEffect(() => {
    cachedGet("loans", () => borrowerApi.get("/borrower/loans").then((res) => res.data as Loan[]))
      .then(setLoans)
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("borrower_token");
          router.push(LOGIN_PATH);
          return;
        }
        setLoadFailed(true);
      });

    cachedGet("loan-requests", () =>
      borrowerApi.get("/borrower/loan-requests").then((res) => res.data as LoanRequest[])
    )
      .then((requests) => setLatestRequest(requests[0] ?? null))
      .catch(() => {
        // Non-critical — the request button still works without the banner.
      });
  }, [router]);

  if (!borrower) return null;

  const firstName = borrower.name.trim().split(/\s+/)[0] || borrower.name;
  const openLoans = (loans ?? [])
    .filter((l) => !CLOSED.includes(l.status))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const closedLoans = (loans ?? []).filter((l) => CLOSED.includes(l.status));
  const payableCount = payableLoans(loans ?? []).length;
  const hasPendingRequest = latestRequest?.status === "pending";

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("home.greeting", { name: firstName })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.subtitle")}</p>
      </header>

      {loadFailed && (
        <Alert variant="destructive">
          <AlertDescription>{t("home.loadError")}</AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("home.yourLoans")}</h2>

        {!loans && !loadFailed ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : openLoans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            {closedLoans.length > 0 ? t("home.noOpenLoans") : t("home.noLoans")}
          </p>
        ) : (
          openLoans.map((loan) => {
            const due = loan.due_date;
            const amount = loan.amount_due_this_week;
            const days = due ? daysUntil(due) : null;

            return (
              <Card key={loan.id}>
                <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{t("home.loanLabel", { number: loan.loan_number ?? "" })}</span>
                      <LoanStatusBadge loan={loan} />
                    </div>
                    {due && amount > 0 ? (
                      <p className="text-base">
                        {rich("next.payBy", {
                          amount: <strong className="text-xl tabular-nums">{formatCurrency(amount)}</strong>,
                          date: <strong>{formatDate(due)}</strong>,
                        })}
                        {days !== null && days < 0 && (
                          <span className="ml-2 text-sm font-medium text-destructive">
                            {days === -1 ? t("next.lateOne") : t("next.lateMany", { days: Math.abs(days) })}
                          </span>
                        )}
                      </p>
                    ) : due ? (
                      <p className="text-base text-success-ink">{t("home.paidUp", { date: formatDate(due) })}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {t("home.stillOwed", { amount: formatCurrency(Math.max(0, loan.balance)) })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => router.push(`/portal/loans/${loan.id}`)}
                    >
                      {t("home.details")}
                    </Button>
                    <Button className="flex-1 sm:flex-none" onClick={() => router.push(`/portal/loans/${loan.id}/pay`)}>
                      <Wallet2 className="size-4" />
                      {t("home.pay")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {payableCount > 1 && (
          <Card className="bg-primary/5 ring-1 ring-primary/15">
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="font-medium">{t("home.payAll")}</div>
                <p className="text-sm text-muted-foreground">{t("home.payAllDesc", { count: payableCount })}</p>
              </div>
              <Button className="sm:flex-none" onClick={() => router.push("/portal/pay-all")}>
                <Wallet2 className="size-4" />
                {t("home.payAll")}
              </Button>
            </CardContent>
          </Card>
        )}

        {closedLoans.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowClosed((v) => !v)}
              aria-expanded={showClosed}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showClosed ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              {t("home.closedLoans", { count: closedLoans.length })}
            </button>
            {showClosed && (
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {closedLoans.map((loan) => (
                  <li key={loan.id}>
                    <Link
                      href={`/portal/loans/${loan.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                    >
                      <span>
                        {t("home.loanLabel", { number: loan.loan_number ?? "" })}
                        <span className="ml-2 text-muted-foreground tabular-nums">{formatCurrency(loan.total_loan)}</span>
                      </span>
                      <LoanStatusBadge loan={loan} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">{t("home.borrowTitle")}</CardTitle>
            <CardDescription>
              {borrower.available_credit === null
                ? t("home.noLimit")
                : borrower.available_credit > 0
                  ? rich("home.canBorrow", {
                      amount: <strong className="text-foreground">{formatCurrency(borrower.available_credit)}</strong>,
                    })
                  : t("home.cannotBorrow")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {latestRequest?.status === "pending" && (
              <Alert>
                <AlertDescription>
                  {t("home.requestPending", { amount: formatCurrency(latestRequest.requested_amount) })}
                </AlertDescription>
              </Alert>
            )}
            {latestRequest?.status === "declined" && (
              <Alert variant="destructive">
                <AlertDescription>
                  {latestRequest.admin_note
                    ? t("home.requestDeclinedReason", { reason: latestRequest.admin_note })
                    : t("home.requestDeclined")}
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Button
                variant="outline"
                onClick={() => setRequestModalOpen(true)}
                disabled={hasPendingRequest}
                title={hasPendingRequest ? t("home.requestWaiting") : undefined}
              >
                <FilePlus2 className="size-4" />
                {t("home.requestButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {openLoans.length > 1 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">{t("home.planTitle")}</CardTitle>
              <CardDescription>{t("home.planDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
              <div className="space-y-1.5 sm:w-56">
                <Label htmlFor="all_loans_payoff_date">{t("home.planPayOn")}</Label>
                <Input
                  id="all_loans_payoff_date"
                  type="date"
                  min={todayInManila()}
                  max={latestProjectableDueDate(openLoans) ?? undefined}
                  value={payoffDate}
                  onChange={(e) => setPayoffDate(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("home.planTotal", { count: openLoans.length, date: formatDate(payoffDate) })}
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {payoffDate ? formatCurrency(combinedPayoff(openLoans, payoffDate)) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">{t("home.planNote")}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <LoanRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSubmitted={(request) => {
          setLatestRequest(request);
          setRequestModalOpen(false);
        }}
        availableCredit={borrower.available_credit}
      />
    </div>
  );
}
