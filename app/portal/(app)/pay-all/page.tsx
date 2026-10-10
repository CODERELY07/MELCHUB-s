"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import { ArrowLeft, Check, Copy, Loader2, ReceiptText, Send, WifiOff } from "lucide-react";

import borrowerApi from "@/lib/borrower-axios";
import { cachedGet } from "@/lib/offline-cache";
import { useI18n } from "@/lib/i18n";
import { payableLoans, totalDueNow, totalOwed } from "@/lib/allocate-payment";
import { PaymentSplitPreview } from "@/components/payment-split-preview";
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
 * Same three steps as paying one loan (client/app/portal/(app)/loans/[id]/pay),
 * but for ALL of the borrower's loans with one GCash payment and one
 * receipt. The receipt is split across the loans when the lender approves
 * it, soonest due date first — the preview here uses the same rule.
 */
export default function PortalPayAllPage() {
  const { t } = useI18n();
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);
  const [online, setOnline] = useState(true);
  const [copied, setCopied] = useState(false);

  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadLoans = () => {
    borrowerApi
      .get("/borrower/loans")
      .then((res) => setLoans(payableLoans(res.data)))
      .catch(() => {});
  };

  const loadProofs = () => {
    cachedGet("payment-proofs-all", () =>
      borrowerApi.get("/borrower/payment-proofs", { params: { loan_id: "all" } }).then((res) => res.data as PaymentProof[])
    )
      .then(setProofs)
      .catch(() => setProofs([]));
  };

  useEffect(() => {
    cachedGet("loans", () => borrowerApi.get("/borrower/loans").then((res) => res.data as Loan[]))
      .then((all) => setLoans(payableLoans(all)))
      .catch(() => setLoans([]));
    cachedGet("payment-settings", () => borrowerApi.get("/settings/payment").then((res) => res.data as PaymentSettings))
      .then(setSettings)
      .catch(() => setSettings({ gcash_name: "", gcash_number: "" }));
    loadProofs();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      loadLoans();
      loadProofs();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

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

  const owed = loans ? totalOwed(loans) : 0;
  const dueNow = loans ? totalDueNow(loans) : 0;
  const amountNumber = Number(amount) || 0;
  const tooMuch = Math.round(amountNumber * 100) > Math.round(owed * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!online) {
      setError(t("pay.errorOffline"));
      return;
    }
    if (tooMuch) {
      setError(t("split.tooMuch", { amount: formatCurrency(owed) }));
      return;
    }
    if (!file) {
      setError(t("pay.errorNoFile"));
      return;
    }

    const formData = new FormData();
    formData.append("all_loans", "1");
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

  if (!loans) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("payAll.back")}
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("payAll.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("payAll.intro")}</p>
      </header>

      {!online && (
        <Alert variant="destructive">
          <WifiOff className="size-4" />
          <AlertDescription>{t("pay.offline")}</AlertDescription>
        </Alert>
      )}

      {loans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          {t("payAll.nothingOwed")}
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">{t("pay.step1")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!online ? (
                <p className="text-sm text-muted-foreground">{t("pay.offlineAmount")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("split.dueNowTotal")}</div>
                    <div className="text-2xl font-bold tracking-tight tabular-nums">{formatCurrency(dueNow)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("split.owedTotal")}</div>
                    <div className="text-2xl font-bold tracking-tight tabular-nums">{formatCurrency(owed)}</div>
                  </div>
                </div>
              )}
              {online && dueNow <= 0 && <p className="text-sm">{t("pay.nothingDue")}</p>}
            </CardContent>
          </Card>

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
                    <AlertDescription>{t("payAll.success")}</AlertDescription>
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
                    max={online ? owed : undefined}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-describedby="amount_max"
                  />
                  {online && (
                    <>
                      <p id="amount_max" className="text-xs text-muted-foreground">
                        {t("split.max", { amount: formatCurrency(owed) })}
                      </p>
                      <div className="flex flex-wrap gap-x-4">
                        {dueNow > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-0 text-primary"
                            onClick={() => setAmount(String(dueNow))}
                          >
                            {t("split.useDue", { amount: formatCurrency(dueNow) })}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-0 text-primary"
                          onClick={() => setAmount(String(owed))}
                        >
                          {t("split.useAll", { amount: formatCurrency(owed) })}
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {online && <PaymentSplitPreview loans={loans} amount={amountNumber} />}

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

                <Button type="submit" size="lg" disabled={submitting || !online || tooMuch} className="w-full">
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {t("pay.submit")}
                </Button>
              </CardContent>
            </form>
          </Card>
        </>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("pay.receiptsTitle")}</h2>
        {!proofs ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : proofs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("payAll.noReceipts")}</p>
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
                    {proof.status === "approved" && proof.note && (
                      <div className="mt-1 text-xs text-muted-foreground">{proof.note}</div>
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
