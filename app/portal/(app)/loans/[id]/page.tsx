"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Wallet, TrendingUp, HandCoins, PiggyBank, CalendarRange, Wallet2 } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { LOGIN_PATH } from "@/lib/auth-context";
import { cachedGet } from "@/lib/offline-cache";
import { LoanHistoryTable } from "@/components/loan-history-table";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Loan, LoanHistoryEntry, LoanStatus } from "@/lib/types";

const STATUS_BADGE: Record<LoanStatus, "default" | "success" | "warning" | "destructive" | "muted"> = {
  pending: "muted",
  active: "default",
  paid: "success",
  overdue: "warning",
  defaulted: "destructive",
  cancelled: "muted",
};

export default function PortalLoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [history, setHistory] = useState<LoanHistoryEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    cachedGet(`loan-${id}`, () =>
      borrowerApi.get(`/borrower/loans/${id}`).then((res) => res.data as Loan)
    )
      .then(setLoan)
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("borrower_token");
          router.push(LOGIN_PATH);
          return;
        }
        setError("Couldn't load this loan.");
      });

    cachedGet(`loan-${id}-history`, () =>
      borrowerApi.get(`/borrower/loans/${id}/history`).then((res) => res.data as LoanHistoryEntry[])
    )
      .then(setHistory)
      .catch(() => {
        // Non-critical — the loan's own numbers above still load fine.
      });
  }, [id, router]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!loan) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Loan {loan.loan_number}</h1>
          <p className="text-sm text-muted-foreground">
            <Badge variant={STATUS_BADGE[loan.status]}>{loan.is_overdue ? "overdue" : loan.status}</Badge>
          </p>
        </div>
        {!["paid", "cancelled", "defaulted"].includes(loan.status) && (
          <Button
            className="self-start sm:self-auto"
            onClick={() => router.push(`/portal/loans/${loan.id}/pay`)}
          >
            <Wallet2 className="size-4" />
            Pay
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Principal" value={formatCurrency(loan.total_loan)} icon={Wallet} tone={1} />
        <StatCard
          label={`Interest so far (${loan.interest_rate}%/day)`}
          value={formatCurrency(loan.interest_amount)}
          icon={TrendingUp}
          tone={4}
        />
        <StatCard label="Total paid" value={formatCurrency(loan.total_paid)} icon={HandCoins} tone={3} />
        <StatCard label="Balance remaining" value={formatCurrency(loan.balance)} icon={PiggyBank} tone={2} />
      </div>

      <Card>
        <CardHeader className="!flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-5/15 text-data-5">
            <CalendarRange className="size-4.5" />
          </span>
          <div>
            <CardTitle as="h2" className="text-base">Loan term</CardTitle>
            <CardDescription>
              {formatDate(loan.start_date)} &ndash; {formatDate(loan.due_date)}
              {loan.plan_name ? ` · ${loan.plan_name}` : ""}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-semibold">History</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Interest builds up day by day based on your rate; payments you make are recorded here as soon as your loan officer confirms them.
        </p>

        {!history ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <LoanHistoryTable entries={history} />
        )}
      </div>
    </div>
  );
}
