"use client";

import { useState } from "react";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import type { LoanRequest, LoanRequestPlan } from "@/lib/types";

interface LoanRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (request: LoanRequest) => void;
}

const PLANS: { value: LoanRequestPlan; title: string; body: string[] }[] = [
  {
    value: "3_day",
    title: "Option 1 — 3-Day Installment Plan (15 days total)",
    body: [
      "Principal: ₱2,000",
      "You pay back 20% of the principal (₱400) plus 0.75% interest every 3 days — ₱415.00 per installment, 5 installments total (Day 3, 6, 9, 12, and 15).",
      "Late penalty: a fixed ₱50.00 is added to any installment paid after its 3-day deadline.",
    ],
  },
  {
    value: "weekly",
    title: "Option 2 — 1-Week Installment Plan (5 weeks total)",
    body: [
      "Principal: ₱2,000",
      "You pay back 20% of the principal (₱400) plus 2.80% interest every week — ₱456.00 per installment, 5 installments total (one per week).",
      "Late penalty: a fixed ₱50.00 is added to any installment paid after its weekly deadline.",
    ],
  },
];

/**
 * Gates a loan request behind actually reading the repayment rules — the
 * submit button stays disabled until the checkbox is checked, same pattern
 * as TermsModal's checkbox + name match. The backend re-validates
 * `acknowledged` as `required|accepted` regardless (see
 * LoanRequestController::store()), since a disabled button is UX only, not
 * a security boundary.
 *
 * These are the two repayment products currently offered — figures are
 * informational; the loan officer sets the loan's actual principal/rate/
 * dates after approving (see docs/loans.md Part 7).
 */
export function LoanRequestModal({ open, onClose, onSubmitted }: LoanRequestModalProps) {
  const [plan, setPlan] = useState<LoanRequestPlan | "">("");
  const [message, setMessage] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPlan("");
    setMessage("");
    setAcknowledged(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!plan) {
      setError("Please choose which plan you're interested in.");
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
      description="Please read the repayment rules below before requesting."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          {PLANS.map((option) => (
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
                <span className="font-medium">{option.title}</span>
              </div>
              <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
                {option.body.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </label>
          ))}
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
          I have read and understood the repayment rules above, including the late penalty.
        </label>

        <p className="text-xs text-muted-foreground">
          Your loan officer will confirm the exact amount and schedule when your request is approved.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!acknowledged || !plan || submitting}>
            {submitting ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
