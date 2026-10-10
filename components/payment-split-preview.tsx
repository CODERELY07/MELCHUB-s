"use client";

import { allocatePayment, totalOwed } from "@/lib/allocate-payment";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Loan } from "@/lib/types";

/**
 * Shows, loan by loan, where one amount for "all my loans" will go —
 * the same rule the server uses when it records it (soonest due first).
 * `loans` must already be in payment order (payableLoans()).
 */
export function PaymentSplitPreview({ loans, amount }: { loans: Loan[]; amount: number }) {
  const { t } = useI18n();
  const owed = totalOwed(loans);
  const valid = amount > 0 && Math.round(amount * 100) <= Math.round(owed * 100);
  const shares = valid ? allocatePayment(loans, amount) : [];
  const shareOf = (id: number) => shares.find((s) => s.loan.id === id)?.amount ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">{t("split.preview")}</div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{t("split.colLoan")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("split.colDue")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("split.colGets")}</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => {
              const share = shareOf(loan.id);
              const paysOff = share > 0 && Math.round(share * 100) === Math.round(Number(loan.balance) * 100);

              return (
                <tr key={loan.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{loan.loan_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {loan.due_date ? formatDate(loan.due_date) : "—"} · {formatCurrency(Math.max(0, loan.balance))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(loan.amount_due_this_week)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {valid ? formatCurrency(share) : "—"}
                    {paysOff && <div className="text-xs font-normal text-success-ink">{t("split.paysOff")}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {amount > 0 && !valid ? (
          <span className="text-destructive">{t("split.tooMuch", { amount: formatCurrency(owed) })}</span>
        ) : amount > 0 ? (
          t("split.howItWorks")
        ) : (
          t("split.typeAmount")
        )}
      </p>
    </div>
  );
}
