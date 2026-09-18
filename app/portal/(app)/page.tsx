"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Wallet, TrendingUp, HandCoins, PiggyBank, FilePlus2, CalendarRange } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { LoanHistoryTable } from "@/components/loan-history-table";
import { LoanRequestModal } from "@/components/loan-request-modal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
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
        <div className="flex items-center gap-3">
          <Avatar name={loan.name} className="size-12 text-base sm:size-14 sm:text-lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {loan.name}</h1>
            <p className="text-sm text-muted-foreground">
              Loan {loan.loan_number} · <Badge variant={STATUS_BADGE[loan.status]}>{loan.is_overdue ? "overdue" : loan.status}</Badge>
            </p>
          </div>
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
            </CardDescription>
          </div>
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
