"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Check, ExternalLink, Loader2, X } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { PaymentProof, PaymentProofStatus } from "@/lib/types";

const STATUS_BADGE: Record<PaymentProofStatus, "muted" | "success" | "destructive"> = {
  pending: "muted",
  approved: "success",
  rejected: "destructive",
};

export default function AdminPaymentProofsPage() {
  const { t } = useI18n();
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [error, setError] = useState("");

  const [approveTarget, setApproveTarget] = useState<PaymentProof | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveError, setApproveError] = useState("");
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<PaymentProof | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // A receipt for all of a person's loans has no loan — name the person
  // from the receipt itself and say it covers all loans.
  const who = (proof: PaymentProof) => proof.loan?.name ?? proof.borrower?.name ?? "?";
  const which = (proof: PaymentProof) => proof.loan?.loan_number ?? t("receipts.allLoans");

  const load = () => {
    api
      .get("/payment-proofs", { params: filter === "pending" ? { status: "pending" } : {} })
      .then((res) => setProofs(res.data))
      .catch(() => setError(t("receipts.loadError")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openApprove = (proof: PaymentProof) => {
    setApproveTarget(proof);
    setApproveAmount(proof.amount);
    setApproveError("");
  };

  const submitApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;
    setApproveError("");
    setApproving(true);

    try {
      await api.post(`/payment-proofs/${approveTarget.id}/approve`, { amount: approveAmount });
      setApproveTarget(null);
      load();
    } catch (err: unknown) {
      setApproveError((isAxiosError(err) && err.response?.data?.message) || t("receipts.approveError"));
    } finally {
      setApproving(false);
    }
  };

  const submitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setRejectError("");
    setRejecting(true);

    try {
      await api.post(`/payment-proofs/${rejectTarget.id}/reject`, { note: rejectNote });
      setRejectTarget(null);
      setRejectNote("");
      load();
    } catch (err: unknown) {
      setRejectError((isAxiosError(err) && err.response?.data?.message) || t("receipts.rejectError"));
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.receipts")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("receipts.subtitle")}</p>
        </div>
        <div className="flex gap-1 self-start rounded-lg border border-border p-1 sm:self-auto">
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "ghost"}
            onClick={() => setFilter("pending")}
          >
            {t("receipts.filterWaiting")}
          </Button>
          <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>
            {t("history.filterAll")}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!proofs ? (
        <div className="flex justify-center rounded-xl border border-border py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : proofs.length === 0 ? (
        <div className="rounded-xl border border-border py-8 text-center text-sm text-muted-foreground">
          {filter === "pending" ? t("receipts.emptyWaiting") : t("receipts.emptyAll")}
        </div>
      ) : (
        <>
          {/* Table — md and up */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("loans.colBorrower")}</th>
                  <th className="px-3 py-2 font-medium">{t("receipts.amountSent")}</th>
                  <th className="px-3 py-2 font-medium">{t("receipts.sent")}</th>
                  <th className="px-3 py-2 font-medium">{t("receipts.screenshot")}</th>
                  <th className="px-3 py-2 font-medium">{t("loans.colStatus")}</th>
                  <th className="px-3 py-2 font-medium text-right">{t("loans.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {proofs.map((proof) => (
                  <tr key={proof.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={who(proof)} />
                        <div>
                          <div className="font-medium">{who(proof)}</div>
                          <div className="text-xs text-muted-foreground">{which(proof)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatCurrency(proof.amount)}</td>
                    <td className="px-3 py-2">{formatDate(proof.created_at)}</td>
                    <td className="px-3 py-2">
                      <a
                        href={proof.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {t("receipts.view")} <ExternalLink className="size-3" />
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_BADGE[proof.status]}>{t(`receipt.${proof.status}`)}</Badge>
                      {proof.status !== "pending" && proof.note && (
                        <div className="mt-1 max-w-[220px] text-xs text-muted-foreground">{proof.note}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {proof.status === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => openApprove(proof)}>
                            <Check className="size-3.5" />
                            {t("receipts.approve")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRejectTarget(proof);
                              setRejectNote("");
                              setRejectError("");
                            }}
                          >
                            <X className="size-3.5" />
                            {t("receipts.reject")}
                          </Button>
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-muted-foreground">
                          {proof.reviewer?.name}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — below md */}
          <div className="flex flex-col gap-3 md:hidden">
            {proofs.map((proof) => (
              <Card key={proof.id}>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={who(proof)} />
                      <div>
                        <div className="font-medium">{who(proof)}</div>
                        <div className="text-xs text-muted-foreground">{which(proof)}</div>
                      </div>
                    </div>
                    <Badge variant={STATUS_BADGE[proof.status]}>{t(`receipt.${proof.status}`)}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">{t("receipts.amountSent")}</div>
                      <div className="font-medium tabular-nums">{formatCurrency(proof.amount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{t("receipts.sent")}</div>
                      <div>{formatDate(proof.created_at)}</div>
                    </div>
                  </div>

                  <a
                    href={proof.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {t("receipts.viewScreenshot")} <ExternalLink className="size-3" />
                  </a>

                  {proof.status !== "pending" && proof.note && (
                    <div className="text-xs text-muted-foreground">{proof.note}</div>
                  )}

                  {proof.status === "pending" ? (
                    <div className="flex gap-2 border-t border-border pt-3">
                      <Button className="flex-1" onClick={() => openApprove(proof)}>
                        <Check className="size-4" />
                        {t("receipts.approve")}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setRejectTarget(proof);
                          setRejectNote("");
                          setRejectError("");
                        }}
                      >
                        <X className="size-4" />
                        {t("receipts.reject")}
                      </Button>
                    </div>
                  ) : (
                    proof.reviewer?.name && (
                      <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                        {t("receipts.reviewedBy", { name: proof.reviewer.name })}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title={t("receipts.approveTitle", { name: approveTarget ? who(approveTarget) : "" })}
        description={t("receipts.approveDesc")}
      >
        <form onSubmit={submitApprove} className="flex flex-col gap-4">
          {approveError && (
            <Alert variant="destructive">
              <AlertDescription>{approveError}</AlertDescription>
            </Alert>
          )}
          {approveTarget && approveTarget.loan_id === null && (
            <Alert>
              <AlertDescription>{t("receipts.allLoansHint")}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="approve_amount">{t("receipts.approveAmount")}</Label>
            <Input
              id="approve_amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              aria-describedby="approve_amount_hint"
            />
            <p id="approve_amount_hint" className="text-xs text-muted-foreground">{t("receipts.approveAmountHint")}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setApproveTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={approving}>
              {approving ? <Loader2 className="size-4 animate-spin" /> : t("receipts.approveConfirm")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={t("receipts.rejectTitle", { name: rejectTarget ? who(rejectTarget) : "" })}
        description={t("receipts.rejectDesc")}
      >
        <form onSubmit={submitReject} className="flex flex-col gap-4">
          {rejectError && (
            <Alert variant="destructive">
              <AlertDescription>{rejectError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reject_note">{t("receipts.rejectReason")}</Label>
            <Textarea
              id="reject_note"
              required
              placeholder={t("receipts.rejectPlaceholder")}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={rejecting}>
              {rejecting ? <Loader2 className="size-4 animate-spin" /> : t("receipts.rejectConfirm")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
