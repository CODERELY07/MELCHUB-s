"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, Upload } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
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
  const { loan } = useBorrowerAuth();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);

  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProofs = () => {
    borrowerApi
      .get("/borrower/payment-proofs")
      .then((res) => setProofs(res.data))
      .catch(() => setProofs([]));
  };

  useEffect(() => {
    borrowerApi
      .get("/settings/payment")
      .then((res) => setSettings(res.data))
      .catch(() => setSettings({ gcash_name: "", gcash_number: "" }));
    loadProofs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pay</h1>
        <p className="text-sm text-muted-foreground">
          Send payment via GCash, then upload your reference screenshot here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GCash payment details</CardTitle>
          <CardDescription>Balance due: {formatCurrency(loan.balance)}</CardDescription>
        </CardHeader>
        <CardContent>
          {settings ? (
            settings.gcash_number ? (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
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
          <CardHeader>
            <CardTitle className="text-base">Submit payment proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
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
            <Button type="submit" disabled={submitting} className="w-full">
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
                  <div>
                    <div className="font-medium">{formatCurrency(proof.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      Submitted {formatDate(proof.created_at)}
                    </div>
                    {proof.status === "rejected" && proof.note && (
                      <div className="mt-1 text-xs text-destructive">{proof.note}</div>
                    )}
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
