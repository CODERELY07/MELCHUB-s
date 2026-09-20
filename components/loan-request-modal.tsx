"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/format";
import { cachedGet } from "@/lib/offline-cache";
import { installmentRate, useRepaymentPlans } from "@/lib/use-repayment-plans";
import type { LoanDefaultsSettings, LoanRequest, LoanRequestPlan } from "@/lib/types";

interface LoanRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (request: LoanRequest) => void;
  /** Loan::availableCredit() — null means the admin hasn't set a credit_limit yet. */
  availableCredit: number | null;
}

/**
 * Gates a loan request behind actually reading the repayment rules — the
 * submit button stays disabled until the checkbox is checked, same pattern
 * as TermsModal's checkbox + name match. The backend re-validates
 * `acknowledged` as `required|accepted`, and re-checks the amount against
 * `availableCredit` server-side too (see LoanRequestController::store()),
 * since a disabled button/input is UX only, not a security boundary.
 */
export function LoanRequestModal({ open, onClose, onSubmitted, availableCredit }: LoanRequestModalProps) {
  const plans = useRepaymentPlans("borrower", open);
  const [plan, setPlan] = useState<LoanRequestPlan | "">("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lateFee, setLateFee] = useState<number | null>(null);

  // The late fee is admin-configurable, so show the real current figure.
  useEffect(() => {
    if (!open) return;
    cachedGet("loan-defaults", () =>
      borrowerApi.get("/settings/loan-defaults").then((res) => res.data as LoanDefaultsSettings)
    )
      .then((d) => setLateFee(Number(d.late_fee_amount)))
      .catch(() => setLateFee(null));
  }, [open]);

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

    if (!plan) {
      setError("Please choose which plan you're interested in.");
      return;
    }
    if (!amountValid) {
      setError("Please enter how much you'd like to borrow.");
      return;
    }
    if (!withinLimit) {
      setError(
        availableCredit !== null
          ? `That's more than your available credit of ${formatCurrency(availableCredit)}.`
          : "Your loan officer hasn't set a borrowing limit for your account yet."
      );
      return;
    }
    if (!acknowledged) {
      setError("Please check the box to confirm you've read the repayment rules.");
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
      setError(
        (isAxiosError(err) && err.response?.data?.message) ||
          "Couldn't submit your request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Request a New Loan"
      description="Enter how much you'd like to borrow, then pick a repayment plan."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {availableCredit === null ? (
          <Alert variant="destructive">
            <AlertDescription>
              Loans aren&apos;t open for requests right now — your loan officer hasn&apos;t set a lending
              budget or a borrowing limit for your account yet. Please contact them directly.
            </AlertDescription>
          </Alert>
        ) : availableCredit <= 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              There&apos;s nothing available to borrow right now — you&apos;ve reached your limit, or the
              lending budget is fully used. Check back later or contact your loan officer.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="loan_request_amount">Amount you&apos;d like to borrow</Label>
              <Input
                id="loan_request_amount"
                type="number"
                step="0.01"
                min="1"
                max={availableCredit}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available: {formatCurrency(availableCredit)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {(plans ?? []).map((option) => {
                const installment = amountValid ? numericAmount * installmentRate(option) : null;
                const cadenceLabel = option.period_days === 7 ? "every week" : `every ${option.period_days} days`;

                return (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-sm transition-colors ${
                      plan === option.key ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="plan"
                        className="mt-1 size-4"
                        checked={plan === option.key}
                        onChange={() => setPlan(option.key)}
                      />
                      <span className="font-medium">
                        {option.name}{" "}
                        <span className="text-muted-foreground">
                          ({option.installments} × {option.period_days}-day)
                        </span>
                      </span>
                    </div>
                    <p className="ml-6 text-muted-foreground">
                      {installment !== null ? (
                        <>
                          <strong className="text-foreground">{formatCurrency(installment)}</strong>{" "}
                          {cadenceLabel}, {option.installments} installments total.
                        </>
                      ) : (
                        <>Enter an amount above to see your {cadenceLabel} installment.</>
                      )}
                    </p>
                  </label>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="loan_request_message" className="text-sm font-medium">
                Anything you&apos;d like to add? <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="loan_request_message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="mb-1.5 font-semibold">Important — due dates &amp; late payment</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  Each installment must be paid <strong className="text-foreground">on or before its due date</strong>{" "}
                  (on the schedule of your chosen plan).
                </li>
                <li>
                  If you can&apos;t pay by the due date, a{" "}
                  <strong className="text-foreground">
                    late fee{lateFee !== null ? ` of ${formatCurrency(lateFee)}` : ""}
                  </strong>{" "}
                  is added to your balance and your due date is pushed out by one installment period.
                </li>
                <li>The late fee can repeat each time an installment is missed, and interest keeps accruing until the loan is fully paid.</li>
                <li>You&apos;ll get an SMS reminder about your due date and any late fee.</li>
              </ul>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I have read and understood the repayment plan above. I understand a late fee is added
              when an installment is not paid by its due date.
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!acknowledged || !plan || !withinLimit || submitting}>
            {submitting ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
