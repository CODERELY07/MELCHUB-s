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
import { formatCurrency } from "@/lib/format";
import type { LoanRequest, LoanRequestPlan } from "@/lib/types";

interface LoanRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (request: LoanRequest) => void;
  /** Loan::availableCredit() — null means the admin hasn't set a credit_limit yet. */
  availableCredit: number | null;
}

/**
 * The two repayment products currently offered — cadence and rate are fixed
 * per product, but every peso figure scales with whatever amount the
 * borrower actually requests (rate is applied to `amount`, computed live as
 * they type). The late penalty is deliberately not a number here — the
 * admin sets that per loan, so this only says one applies.
 */
const PLANS: {
  value: LoanRequestPlan;
  title: string;
  periods: number;
  totalLabel: string;
  cadenceLabel: string;
  rate: number; // fraction of `amount` per installment (principal share + interest)
}[] = [
  {
    value: "3_day",
    title: "Option 1 — 3-Day Installment Plan",
    periods: 5,
    totalLabel: "15 days total",
    cadenceLabel: "every 3 days",
    rate: 0.2 + 0.0075, // 20% of principal + 0.75% interest (0.25%/day × 3 days)
  },
  {
    value: "weekly",
    title: "Option 2 — 1-Week Installment Plan",
    periods: 5,
    totalLabel: "5 weeks total",
    cadenceLabel: "every week",
    rate: 0.2 + 0.028, // 20% of principal + 2.80% interest (0.40%/day × 7 days)
  },
];

/**
 * Gates a loan request behind actually reading the repayment rules — the
 * submit button stays disabled until the checkbox is checked, same pattern
 * as TermsModal's checkbox + name match. The backend re-validates
 * `acknowledged` as `required|accepted`, and re-checks the amount against
 * `availableCredit` server-side too (see LoanRequestController::store()),
 * since a disabled button/input is UX only, not a security boundary.
 */
export function LoanRequestModal({ open, onClose, onSubmitted, availableCredit }: LoanRequestModalProps) {
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
              Your loan officer hasn&apos;t set a borrowing limit for your account yet — please contact
              them directly to request a loan.
            </AlertDescription>
          </Alert>
        ) : availableCredit <= 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              You&apos;ve reached your borrowing limit. Pay down your current loan to request more.
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
              {PLANS.map((option) => {
                const installment = amountValid ? numericAmount * option.rate : null;

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-sm transition-colors ${
                      plan === option.value ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="plan"
                        className="mt-1 size-4"
                        checked={plan === option.value}
                        onChange={() => setPlan(option.value)}
                      />
                      <span className="font-medium">
                        {option.title} <span className="text-muted-foreground">({option.totalLabel})</span>
                      </span>
                    </div>
                    <p className="ml-6 text-muted-foreground">
                      {installment !== null ? (
                        <>
                          <strong className="text-foreground">{formatCurrency(installment)}</strong>{" "}
                          {option.cadenceLabel}, {option.periods} installments total.
                        </>
                      ) : (
                        <>Enter an amount above to see your {option.cadenceLabel} installment.</>
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

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I have read and understood the repayment plan above. I understand a late penalty applies
              to any installment paid after its deadline, which my loan officer will confirm.
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {availableCredit !== null && availableCredit > 0 && (
            <Button type="submit" disabled={!acknowledged || !plan || !withinLimit || submitting}>
              {submitting ? "Submitting..." : "Submit request"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
