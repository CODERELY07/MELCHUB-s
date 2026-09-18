"use client";

import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Loan } from "@/lib/types";

interface TermsModalProps {
  loan: Loan;
  onAccepted: (loan: Loan) => void;
}

const TERMS_TEXT = `
MELCHUB Loan Agreement — Terms & Conditions

1. Loan amount and interest. The principal amount, daily interest rate, start date, and due date of your loan are as recorded in your MELCHUB account and shown on your dashboard. Interest accrues daily on the original principal for every day the loan remains open.

2. Payments. Payments may be made via GCash to the account shown on your dashboard. After sending payment, upload a screenshot of your GCash reference as proof; your loan officer will review and confirm it. Your balance only updates once a payment is confirmed.

3. Due date and late fees. If your loan is not fully paid by its due date, a late fee of ₱15.00 will be added and your due date will automatically be extended by one week. This may repeat if the loan remains unpaid.

4. Communication. You agree to receive SMS messages from MELCHUB regarding your loan, including payment reminders, due date notices, and payment confirmations, at the phone number on file.

5. Accuracy of information. You confirm that the personal information on your account (name, contact details) is accurate, and agree to keep it up to date via your profile page.

6. Agreement. By checking the box below and typing your full name as your signature, you acknowledge that you have read and agree to these terms, and that your typed name serves as your electronic signature on this agreement.
`.trim();

export function TermsModal({ loan, onAccepted }: TermsModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A real modal dialog, not just one styled to look like it — showModal()
  // is what actually gives this a ::backdrop, traps focus, and blocks
  // interaction with the portal underneath until terms are accepted.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const nameMatches =
    signatureName.trim().length > 0 &&
    signatureName.trim().toLowerCase() === loan.name.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!agreed) {
      setError("Please check the box to confirm you agree to the terms.");
      return;
    }
    if (!nameMatches) {
      setError(`Please type your full name exactly as "${loan.name}" to sign.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await borrowerApi.post("/borrower/accept-terms", {
        signature_name: signatureName.trim(),
      });
      onAccepted(res.data);
    } catch (err: unknown) {
      setError(
        (isAxiosError(err) && err.response?.data?.message) ||
          "Couldn't save your agreement. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={ref}
      // Acceptance is mandatory — there's no other way out of this loan's
      // onboarding, so Escape doesn't get to be a silent bypass.
      onCancel={(e) => e.preventDefault()}
      className="inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-2xl rounded-b-none border-t border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60 open:animate-in open:fade-in-0 open:slide-in-from-bottom open:duration-300 sm:inset-0 sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-xl sm:border-t-0 sm:border sm:open:slide-in-from-bottom-0 sm:open:zoom-in-95 sm:open:duration-150"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col sm:max-h-[85vh]">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted sm:hidden" aria-hidden="true" />
        <div className="border-b border-border p-6 pb-4">
          <h2 className="text-lg font-semibold">Terms & Conditions</h2>
          <p className="text-sm text-muted-foreground">
            Please review and agree before continuing.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">
            {TERMS_TEXT}
          </pre>
        </div>

        <div className="flex flex-col gap-4 border-t border-border p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I have read and agree to the terms and conditions above.
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="signature_name">
              Type your full name as your signature
            </Label>
            <Input
              id="signature_name"
              placeholder={loan.name}
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "I Agree & Sign"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
