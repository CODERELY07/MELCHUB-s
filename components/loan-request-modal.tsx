"use client";

import { useState } from "react";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { useLateFee } from "@/components/next-payment-card";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { installmentRate, useRepaymentPlans } from "@/lib/use-repayment-plans";
import type { LoanRequest, LoanRequestPlan } from "@/lib/types";

interface LoanRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (request: LoanRequest) => void;
  /** Borrower::availableCredit() — null means the admin hasn't set a credit_limit yet. */
  availableCredit: number | null;
}

/**
 * Asking for a loan, in the order a borrower thinks about it: how much →
 * how to pay it back (with the real per-payment amount) → the rules about
 * paying late, read before sending. The backend re-checks the amount and
 * the "I've read this" box (LoanRequestController::store()) — a disabled
 * button here is a convenience, not the rule.
 */
export function LoanRequestModal({ open, onClose, onSubmitted, availableCredit }: LoanRequestModalProps) {
  const { t } = useI18n();
  const plans = useRepaymentPlans("borrower", open);
  const lateFee = useLateFee();
  const [plan, setPlan] = useState<LoanRequestPlan | "">("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPlan("");
    setAmount("");
    setMessage("");
    setAcknowledged(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const numericAmount = Number(amount);
  const amountValid = amount !== "" && Number.isFinite(numericAmount) && numericAmount > 0;
  const withinLimit = availableCredit !== null && amountValid && numericAmount <= availableCredit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!amountValid) {
      setError(t("req.errorAmount"));
      return;
    }
    if (!withinLimit) {
      setError(
        availableCredit !== null
          ? t("req.errorOver", { amount: formatCurrency(availableCredit) })
          : t("home.noLimit")
      );
      return;
    }
    if (!plan) {
      setError(t("req.errorPlan"));
      return;
    }
    if (!acknowledged) {
      setError(t("req.errorAck"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await borrowerApi.post("/borrower/loan-requests", {
        plan,
        requested_amount: numericAmount,
        message: message.trim() || undefined,
        acknowledged: true,
      });
      reset();
      onSubmitted(res.data);
    } catch (err: unknown) {
      setError((isAxiosError(err) && err.response?.data?.message) || t("req.errorFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t("req.title")} description={t("req.desc")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {availableCredit === null ? (
          <Alert variant="destructive">
            <AlertDescription>{t("req.noLimit")}</AlertDescription>
          </Alert>
        ) : availableCredit <= 0 ? (
          <Alert variant="destructive">
            <AlertDescription>{t("req.noRoom")}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="loan_request_amount">{t("req.amount")}</Label>
              <Input
                id="loan_request_amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="1"
                max={availableCredit}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby="loan_request_amount_hint"
              />
              <p id="loan_request_amount_hint" className="text-xs text-muted-foreground">
                {t("req.available", { amount: formatCurrency(availableCredit) })}
              </p>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">{t("req.planLabel")}</legend>
              {(plans ?? []).map((option) => {
                const installment = amountValid ? numericAmount * installmentRate(option) : null;
                const period = option.period_days === 7 ? t("req.week") : t("req.days", { days: option.period_days });

                return (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      plan === option.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      className="mt-1 size-4"
                      checked={plan === option.key}
                      onChange={() => setPlan(option.key)}
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-muted-foreground">
                        {t("req.planDetail", { count: option.installments, period })}
                      </span>
                      <span className={installment !== null ? "font-semibold tabular-nums" : "text-muted-foreground"}>
                        {installment !== null
                          ? t("req.perPayment", { amount: formatCurrency(installment) })
                          : t("req.enterAmountFirst")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="loan_request_message">
                {t("req.message")} <span className="text-muted-foreground">{t("common.optional")}</span>
              </Label>
              <Textarea id="loan_request_message" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            <div className="rounded-lg bg-warning/10 p-3 text-sm ring-1 ring-warning/30">
              <p className="mb-1.5 font-semibold">{t("req.rulesTitle")}</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>{t("req.rule1")}</li>
                <li>
                  {lateFee !== null && lateFee > 0
                    ? t("req.rule2Fee", { fee: formatCurrency(lateFee) })
                    : t("req.rule2")}
                </li>
                <li>{t("req.rule3")}</li>
                <li>{t("req.rule4")}</li>
              </ul>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              {t("req.ack")}
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          {/* Always shown (disabled until everything's filled in) — a missing button read as "you can't ask at all". */}
          <Button type="submit" disabled={!acknowledged || !plan || !withinLimit || submitting}>
            {submitting ? t("req.submitting") : t("req.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
