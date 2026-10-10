"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft, Check, Copy, Loader2, ReceiptText, Send, WifiOff } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { cachedGet } from "@/lib/offline-cache";
import { useI18n } from "@/lib/i18n";
import { useLateFee } from "@/components/next-payment-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Loan, PaymentProof, PaymentProofStatus, PaymentSettings } from "@/lib/types";

const RECEIPT_BADGE: Record<PaymentProofStatus, "muted" | "success" | "destructive"> = {
  pending: "muted",
  approved: "success",
  rejected: "destructive",
};

/**
 * Paying is three real steps that happen in this order — see how much,
 * send it in GCash (outside this app), send the receipt back here — so the
 * page is laid out as exactly those three steps, numbered.
 */
export default function PortalLoanPayPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const lateFee = useLateFee();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);
  const [online, setOnline] = useState(true);
  const [copied, setCopied] = useState(false);

  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // Changing the key remounts the file input — the only way to really clear it after sending.
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadLoan = () => {
    borrowerApi.get(`/borrower/loans/${id}`).then((res) => setLoan(res.data)).catch(() => {});
  };

  const loadProofs = () => {
    cachedGet(`payment-proofs-${id}`, () =>
      borrowerApi.get("/borrower/payment-proofs", { params: { loan_id: id } }).then((res) => res.data as PaymentProof[])
    )
      .then(setProofs)
      .catch(() => setProofs([]));
  };

  useEffect(() => {
    cachedGet(`loan-${id}`, () => borrowerApi.get(`/borrower/loans/${id}`).then((res) => res.data as Loan))
      .then(setLoan)
      .catch(() => {});
    cachedGet("payment-settings", () => borrowerApi.get("/settings/payment").then((res) => res.data as PaymentSettings))
      .then(setSettings)
      .catch(() => setSettings({ gcash_name: "", gcash_number: "" }));
    loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Paying needs a live connection: the amount due must be current, and the
  // receipt upload can't be queued. Track connectivity to gate the form.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      loadLoan();
      loadProofs();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyNumber = async () => {
    if (!settings?.gcash_number) return;
    try {
      await navigator.clipboard.writeText(settings.gcash_number.replace(/\s+/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the number is still on screen to type by hand.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!online) {
      setError(t("pay.errorOffline"));
      return;
    }
    if (!file) {
      setError(t("pay.errorNoFile"));
      return;
    }

    const formData = new FormData();
    formData.append("loan_id", String(id));
    formData.append("amount", amount);
    formData.append("screenshot", file);

    setSubmitting(true);
    try {
      await borrowerApi.post("/borrower/payment-proofs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(true);
      setAmount("");
      setFile(null);
      setFileInputKey((k) => k + 1);
      loadProofs();
    } catch (err: unknown) {
      setError(
        (isAxiosError(err) && (err.response?.data?.errors?.screenshot?.[0] || err.response?.data?.message)) ||
          t("pay.errorFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!loan) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const amountDue = loan.amount_due_this_week;
  const pastDue = loan.past_due_amount;
  const paidUp = amountDue <= 0;
  const open = !["paid", "cancelled", "defaulted"].includes(loan.status);
  const autoFee = loan.installments_enabled && loan.auto_penalty && lateFee !== null && lateFee > 0;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href={`/portal/loans/${loan.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("loan.title", { number: loan.loan_number ?? "" })}
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("pay.title", { number: loan.loan_number ?? "" })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("pay.intro")}</p>
      </header>

      {!online && (
        <Alert variant="destructive">
          <WifiOff className="size-4" />
          <AlertDescription>{t("pay.offline")}</AlertDescription>
        </Alert>
      )}

      {open && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">{t("pay.step1")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!online ? (
              <p className="text-sm text-muted-foreground">{t("pay.offlineAmount")}</p>
            ) : paidUp ? (
              <p className="text-sm">{t("pay.nothingDue")}</p>
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight tabular-nums">{formatCurrency(amountDue)}</div>
                {loan.due_date && (
                  <p className="text-sm font-medium">{t("pay.payBy", { date: formatDate(loan.due_date) })}</p>
                )}
                {pastDue > 0 && (
                  <p className="text-sm text-destructive">{t("pay.includesPast", { amount: formatCurrency(pastDue) })}</p>
                )}
                {autoFee && (
                  <p className="text-xs text-muted-foreground">{t("pay.lateFee", { fee: formatCurrency(lateFee) })}</p>
                )}
              </>
            )}
            {online && (
              <p className="text-xs text-muted-foreground">
                {t("pay.balanceLeft", { amount: formatCurrency(Math.max(0, loan.balance)) })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-base">{t("pay.step2")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!settings ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : settings.gcash_number ? (
            <div className="flex flex-col gap-3 rounded-lg bg-chart-2/10 p-4 ring-1 ring-chart-2/15 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{t("pay.gcashTo")}</div>
                <div className="font-medium">{settings.gcash_name}</div>
                <div className="text-xl font-semibold tracking-wide tabular-nums">{settings.gcash_number}</div>
              </div>
              <Button type="button" variant="outline" onClick={copyNumber}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t("pay.copied") : t("pay.copy")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("pay.noGcash")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle as="h2" className="text-base">{t("pay.step3")}</CardTitle>
            <CardDescription>{t("pay.step3Desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                <AlertDescription>{t("pay.success")}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("pay.amountSent")}</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {online && !paidUp && open && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-primary"
                  onClick={() => setAmount(String(amountDue))}
                >
                  {t("pay.useAmount", { amount: formatCurrency(amountDue) })}
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="screenshot">{t("pay.screenshot")}</Label>
              <Input
                key={fileInputKey}
                id="screenshot"
                type="file"
                accept="image/*"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button type="submit" size="lg" disabled={submitting || !online} className="w-full">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {t("pay.submit")}
            </Button>
          </CardContent>
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("pay.receiptsTitle")}</h2>
        {!proofs ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : proofs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("pay.noReceipts")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {proofs.map((proof) => (
              <li key={proof.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-data-4">
                    <ReceiptText className="size-4" />
                  </span>
                  <div>
                    <div className="font-medium tabular-nums">{formatCurrency(proof.amount)}</div>
                    <div className="text-xs text-muted-foreground">{t("pay.sentOn", { date: formatDate(proof.created_at) })}</div>
                    {proof.status === "rejected" && proof.note && (
                      <div className="mt-1 text-xs text-destructive">{t("pay.rejectedReason", { reason: proof.note })}</div>
                    )}
                  </div>
                </div>
                <Badge variant={RECEIPT_BADGE[proof.status]}>{t(`receipt.${proof.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
