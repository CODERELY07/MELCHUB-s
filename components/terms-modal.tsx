"use client";

import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TERMS_TEXT } from "@/lib/terms";
import type { Loan } from "@/lib/types";

interface TermsModalProps {
  loan: Loan;
  onAccepted: (loan: Loan) => void;
}

export function TermsModal({ loan, onAccepted }: TermsModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

    // Signing is binding, so ask once more before actually saving.
    if (!confirming) {
      setConfirming(true);
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
      setConfirming(false);
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
            <span>
              I have read and agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                Terms &amp; Conditions
              </a>
              .
            </span>
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

          {confirming ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">
                Are you sure you agree to the Terms &amp; Conditions? Your typed name will serve as your
                electronic signature.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirming(false)} disabled={submitting}>
                  Go back
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Saving..." : "Yes, I agree"}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="submit" className="w-full">
              I Agree &amp; Sign
            </Button>
          )}
        </div>
      </form>
    </dialog>
  );
}
