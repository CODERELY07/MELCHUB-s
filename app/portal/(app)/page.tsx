"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { LoanHistoryTable } from "@/components/loan-history-table";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LoanHistoryEntry, LoanStatus } from "@/lib/types";

const STATUS_BADGE: Record<LoanStatus, "default" | "success" | "warning" | "destructive" | "muted"> = {
  pending: "muted",
  active: "default",
  paid: "success",
  overdue: "warning",
  defaulted: "destructive",
  cancelled: "muted",
};

export default function PortalHomePage() {
  const { loan } = useBorrowerAuth();
  const [history, setHistory] = useState<LoanHistoryEntry[] | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    borrowerApi
      .get("/borrower/history")
      .then((res) => setHistory(res.data))
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("borrower_token");
          router.push("/portal/login");
          return;
        }
        setError("Couldn't load your loan history.");
      });
  }, [router]);

  if (!loan) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {loan.name}</h1>
        <p className="text-sm text-muted-foreground">
          Loan {loan.loan_number} · <Badge variant={STATUS_BADGE[loan.status]}>{loan.is_overdue ? "overdue" : loan.status}</Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Principal</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(loan.total_loan)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Interest so far ({loan.interest_rate}%/day)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(loan.interest_amount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total paid</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(loan.total_paid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Balance remaining</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(loan.balance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loan term</CardTitle>
          <CardDescription>
            {formatDate(loan.start_date)} &ndash; {formatDate(loan.due_date)}
          </CardDescription>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-semibold">History</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Interest builds up day by day based on your rate; payments you make are recorded here as soon as your loan officer confirms them.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!history && !error ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <LoanHistoryTable entries={history ?? []} />
        )}
      </div>
    </div>
  );
}
