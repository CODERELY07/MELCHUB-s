"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { FilePlus2, ChevronRight } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { LOGIN_PATH } from "@/lib/auth-context";
import { cachedGet } from "@/lib/offline-cache";
import { LoanRequestModal } from "@/components/loan-request-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Loan, LoanRequest, LoanStatus } from "@/lib/types";

const STATUS_BADGE: Record<LoanStatus, "default" | "success" | "warning" | "destructive" | "muted"> = {
  pending: "muted",
  active: "default",
  paid: "success",
  overdue: "warning",
  defaulted: "destructive",
  cancelled: "muted",
};

export default function PortalHomePage() {
  const { borrower } = useBorrowerAuth();
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState("");
  const [latestRequest, setLatestRequest] = useState<LoanRequest | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const router = useRouter();

  const loadLatestRequest = () => {
    cachedGet("loan-requests", () =>
      borrowerApi.get("/borrower/loan-requests").then((res) => res.data as LoanRequest[])
    )
      .then((requests) => setLatestRequest(requests[0] ?? null))
      .catch(() => {
        // Non-critical — the request button still works even if this fails
        // to load, it just won't show a pending/declined banner.
      });
  };

  useEffect(() => {
    cachedGet("loans", () =>
      borrowerApi.get("/borrower/loans").then((res) => res.data as Loan[])
    )
      .then(setLoans)
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("borrower_token");
          router.push(LOGIN_PATH);
          return;
        }
        setError("Couldn't load your loans.");
      });

    loadLatestRequest();
  }, [router]);

  if (!borrower) return null;

  const hasPendingRequest = latestRequest?.status === "pending";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {borrower.name}</h1>
          <p className="text-sm text-muted-foreground">Your loans with MELCHUB</p>
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

      {borrower.available_credit !== null && (
        <Alert>
          <AlertDescription>
            {borrower.available_credit > 0 ? (
              <>
                You can borrow up to{" "}
                <strong className="text-foreground">{formatCurrency(borrower.available_credit)}</strong> right now.
              </>
            ) : (
              <>There&apos;s nothing available to borrow right now.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {latestRequest?.status === "pending" && (
        <Alert>
          <AlertDescription>
            Your request for {formatCurrency(latestRequest.requested_amount)} is pending review.
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Your loans</h2>

        {!loans && !error ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : loans && loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any loans yet. Once your loan officer sets one up, or a request of
            yours is approved, it&apos;ll show up here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {loans?.map((loan) => (
              <Link key={loan.id} href={`/portal/loans/${loan.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="flex items-center justify-between gap-3 pt-4">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {loan.loan_number}
                        <Badge variant={STATUS_BADGE[loan.status]}>
                          {loan.is_overdue ? "overdue" : loan.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Balance {formatCurrency(loan.balance)}
                        {loan.due_date ? ` · due ${formatDate(loan.due_date)}` : ""}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

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
