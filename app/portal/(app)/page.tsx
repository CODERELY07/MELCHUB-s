"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Wallet, TrendingUp, HandCoins, PiggyBank, FilePlus2 } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { LoanHistoryTable } from "@/components/loan-history-table";
import { LoanRequestModal } from "@/components/loan-request-modal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LoanHistoryEntry, LoanRequest, LoanStatus } from "@/lib/types";

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
  const [latestRequest, setLatestRequest] = useState<LoanRequest | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const router = useRouter();

  const loadLatestRequest = () => {
    borrowerApi
      .get("/borrower/loan-requests")
      .then((res) => setLatestRequest((res.data as LoanRequest[])[0] ?? null))
      .catch(() => {
        // Non-critical — the request button still works even if this fails
        // to load, it just won't show a pending/declined banner.
      });
  };

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

    loadLatestRequest();
  }, [router]);

  if (!loan) return null;

  const hasPendingRequest = latestRequest?.status === "pending";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {loan.name}</h1>
          <p className="text-sm text-muted-foreground">
            Loan {loan.loan_number} · <Badge variant={STATUS_BADGE[loan.status]}>{loan.is_overdue ? "overdue" : loan.status}</Badge>
          </p>
        </div>
        <Button
          variant="outline"
          className="self-start sm:self-auto"
          onClick={() => setRequestModalOpen(true)}
          disabled={hasPendingRequest}
          title={hasPendingRequest ? "You already have a request pending review" : undefined}
        >
          <FilePlus2 className="size-4" />
          Request a New Loan
        </Button>
      </div>

      {latestRequest?.status === "pending" && (
        <Alert>
          <AlertDescription>
            Your loan request ({latestRequest.plan === "3_day" ? "3-day" : "weekly"} plan) is pending review.
          </AlertDescription>
        </Alert>
      )}
      {latestRequest?.status === "declined" && (
        <Alert variant="destructive">
          <AlertDescription>
            Your last loan request wasn&apos;t approved{latestRequest.admin_note ? `: ${latestRequest.admin_note}` : "."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>Principal</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-1/15 text-chart-1">
                <Wallet className="size-4" />
              </div>
            </div>
            <CardTitle className="text-2xl">{formatCurrency(loan.total_loan)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>Interest so far ({loan.interest_rate}%/day)</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <CardTitle className="text-2xl">{formatCurrency(loan.interest_amount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>Total paid</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3">
                <HandCoins className="size-4" />
              </div>
            </div>
            <CardTitle className="text-2xl">{formatCurrency(loan.total_paid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>Balance remaining</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-2/15 text-chart-2">
                <PiggyBank className="size-4" />
              </div>
            </div>
            <CardTitle className="text-2xl">{formatCurrency(loan.balance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-base">Loan term</CardTitle>
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

      <LoanRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSubmitted={(request) => {
          setLatestRequest(request);
          setRequestModalOpen(false);
        }}
      />
    </div>
  );
}
