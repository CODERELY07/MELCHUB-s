"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { CalendarClock, Loader2, ReceiptText, Upload, WifiOff, Wallet } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { cachedGet } from "@/lib/offline-cache";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PaymentProof, PaymentProofStatus, PaymentSettings } from "@/lib/types";

const STATUS_BADGE: Record<PaymentProofStatus, "muted" | "success" | "destructive"> = {
  pending: "muted",
  approved: "success",
  rejected: "destructive",
};

export default function PortalPayPage() {
  const { loan, refresh } = useBorrowerAuth();
  const [online, setOnline] = useState(true);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);

  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProofs = () => {
    cachedGet("payment-proofs", () =>
      borrowerApi.get("/borrower/payment-proofs").then((res) => res.data as PaymentProof[])
    )
      .then(setProofs)
      .catch(() => setProofs([]));
  };

  useEffect(() => {
    cachedGet("payment-settings", () =>
      borrowerApi.get("/settings/payment").then((res) => res.data as PaymentSettings)
    )
      .then(setSettings)
      .catch(() => setSettings({ gcash_name: "", gcash_number: "" }));
    loadProofs();
    // Always pull the latest loan here — what's due comes from it.
    refresh();
  }, [refresh]);

  // Paying needs a live connection: the amount due must be current, and the
  // proof upload can't be queued. Track connectivity to gate the form.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      refresh();
      loadProofs();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!online) {
      setError("You're offline. Connect to the internet to submit a payment.");
      return;
    }
    if (!file) {
      setError("Please choose a screenshot to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("screenshot", file);

    setSubmitting(true);
    try {
      await borrowerApi.post("/borrower/payment-proofs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Submitted! Your loan officer will review it shortly.");
      setAmount("");
      setFile(null);
      loadProofs();
    } catch (err: unknown) {
      setError(
        (isAxiosError(err) && (err.response?.data?.message || err.response?.data?.errors?.screenshot?.[0])) ||
          "Couldn't submit your payment proof."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!loan) return null;

  // One installment: 20% of principal plus interest for the plan's period.
  // Never more than what's actually still owed.
  const periodDays = loan.repayment_plan === "3_day" ? 3 : 7;
  const periodLabel = loan.repayment_plan === "3_day" ? "3 days" : "week";
  const installment = Math.min(
    loan.balance,
    Number(loan.total_loan) * (0.2 + (Number(loan.interest_rate) / 100) * periodDays)
  );
  const nothingOwed = loan.balance <= 0;

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pay</h1>
        <p className="text-sm text-muted-foreground">
          Send payment via GCash, then upload your reference screenshot here.
        </p>
      </div>

      {!online && (
        <Alert variant="destructive">
          <WifiOff className="size-4" />
          <AlertDescription>
            You&apos;re offline. Paying needs an internet connection so we can show your up-to-date
            amount due. Please go online to pay.
          </AlertDescription>
        </Alert>
      )}

      {!nothingOwed && (
        <Card>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-1/15 text-data-1">
              <CalendarClock className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">
                Pay for this {periodLabel}
              </CardTitle>
              <CardDescription>
                {loan.repayment_plan === "3_day" ? "3-day" : "Weekly"} plan
                {loan.due_date ? ` · due ${formatDate(loan.due_date)}` : ""}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{online ? formatCurrency(installment) : "—"}</div>
            <p className="text-xs text-muted-foreground">
              {online
                ? `Balance remaining: ${formatCurrency(loan.balance)}`
                : "Go online to see your current amount due."}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="!flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/15 text-data-2">
            <Wallet className="size-4.5" />
          </span>
          <div>
            <CardTitle as="h2" className="text-base">GCash payment details</CardTitle>
            <CardDescription>Balance due: {formatCurrency(loan.balance)}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {settings ? (
            settings.gcash_number ? (
              <div className="rounded-lg bg-chart-2/10 p-3 text-sm ring-1 ring-chart-2/15">
                <div className="font-medium">{settings.gcash_name}</div>
                <div className="font-mono text-lg tracking-wide">{settings.gcash_number}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your loan officer hasn&apos;t set up GCash details yet — please contact them directly.
              </p>
            )
          ) : (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-3/15 text-data-3">
              <Upload className="size-4.5" />
            </span>
            <CardTitle as="h2" className="text-base">Submit payment proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount you sent</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="screenshot">GCash reference screenshot</Label>
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={submitting || !online} className="w-full">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Upload className="size-4" />
                  Submit for review
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Your submissions</h2>
        {!proofs ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : proofs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment proofs submitted yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {proofs.map((proof) => (
              <Card key={proof.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-data-4">
                      <ReceiptText className="size-4" />
                    </span>
                    <div>
                      <div className="font-medium">{formatCurrency(proof.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {formatDate(proof.created_at)}
                      </div>
                      {proof.status === "rejected" && proof.note && (
                        <div className="mt-1 text-xs text-destructive">{proof.note}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_BADGE[proof.status]}>{proof.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
