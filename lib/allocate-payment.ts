import type { Loan, LoanStatus } from "@/lib/types";

const CLOSED: LoanStatus[] = ["paid", "cancelled", "defaulted"];

/**
 * The loans one "all my loans" payment can go to, in the order it fills
 * them: open, still owing, soonest due date first (no due date last, then
 * oldest). Mirrors Borrower::loansForPayment() on the server.
 */
export function payableLoans(loans: Loan[]): Loan[] {
  return loans
    .filter((l) => !CLOSED.includes(l.status) && Number(l.balance) > 0)
    .sort((a, b) => {
      if (a.due_date !== b.due_date) {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      return a.id - b.id;
    });
}

export interface PaymentShare {
  loan: Loan;
  amount: number;
}

const cents = (n: number) => Math.round(Number(n) * 100);

/** Total still owed across `loans` (already from payableLoans()). */
export function totalOwed(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + cents(l.balance), 0) / 100;
}

/** What has to be paid by each loan's next deadline, summed. */
export function totalDueNow(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + cents(l.amount_due_this_week), 0) / 100;
}

/**
 * A preview of how `amount` will be split — the same two passes as
 * Borrower::splitPayment() on the server, which does the real split:
 * first what each loan needs by its next deadline (soonest due first),
 * then the rest onto the remaining balances in the same order. Worked in
 * centavos so the shares add up exactly.
 */
export function allocatePayment(loans: Loan[], amount: number): PaymentShare[] {
  let left = cents(amount);
  const shares = new Map<number, number>();

  const passes = [(l: Loan) => cents(l.amount_due_this_week), (l: Loan) => Math.max(0, cents(l.balance))];

  for (const capOf of passes) {
    for (const loan of loans) {
      if (left <= 0) break;
      const room = capOf(loan) - (shares.get(loan.id) ?? 0);
      const take = Math.min(left, Math.max(0, room));
      if (take > 0) {
        shares.set(loan.id, (shares.get(loan.id) ?? 0) + take);
        left -= take;
      }
    }
  }

  return [...shares.entries()].map(([id, c]) => ({ loan: loans.find((l) => l.id === id)!, amount: c / 100 }));
}
