import type { Loan, LoanStatus } from "@/lib/types";

const CLOSED_STATUSES: LoanStatus[] = ["paid", "cancelled", "defaulted"];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Calendar-day difference (UTC, date-only) between two date strings. */
function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime();
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86400000);
}

/**
 * What this loan would total if paid on `asOfDate` (a "YYYY-MM-DD" string) —
 * mirrors `Loan::interestAmount()`/`balance()` on the server exactly
 * (server/app/Models/Loan.php), just evaluated at an arbitrary cutoff date
 * instead of "today", so a borrower can see how paying earlier than their
 * due date reduces the interest they owe. Only meaningful between the
 * loan's start_date and due_date — before start_date no interest has
 * accrued yet, and past due_date a real late fee may already have been
 * applied server-side, which this doesn't attempt to simulate.
 */
export function projectedPayoff(loan: Loan, asOfDate: string): number {
  const totalLoan = Number(loan.total_loan);
  const penalty = Number(loan.penalty_amount);
  const paid = Number(loan.total_paid);

  if (!loan.start_date || asOfDate < loan.start_date.slice(0, 10)) {
    return round2(totalLoan + penalty - paid);
  }

  const days = daysBetween(loan.start_date, asOfDate) + 1;
  const rate = Number(loan.interest_rate) / 100;
  let interestAmount: number;

  if (loan.compounds_interest) {
    // Mirrors Loan::catchUpInterest() exactly: each day's interest is a % of
    // the running balance (principal + every prior day's interest), not a
    // flat amount — so it has to be walked day by day, not multiplied.
    let balance = totalLoan;
    for (let i = 0; i < days; i++) {
      balance = round2(balance + round2(balance * rate));
    }
    interestAmount = round2(balance - totalLoan);
  } else {
    const dailyInterest = round2(totalLoan * rate);
    interestAmount = round2(dailyInterest * days);
  }

  return round2(totalLoan + interestAmount + penalty - paid);
}

/** Open enough to meaningfully project a future payoff for: not closed, not already overdue, and has a due date. */
export function isProjectable(loan: Loan): boolean {
  return Boolean(loan.due_date) && !loan.is_overdue && !CLOSED_STATUSES.includes(loan.status);
}

/** The latest due date among a borrower's projectable loans, or null if none qualify. */
export function latestProjectableDueDate(loans: Loan[]): string | null {
  const dates = loans.filter(isProjectable).map((l) => l.due_date!.slice(0, 10));
  return dates.length === 0 ? null : dates.reduce((latest, d) => (d > latest ? d : latest));
}

/**
 * Combined total across every one of a borrower's loans if paid on `date`
 * (a "YYYY-MM-DD" string). Each projectable loan is capped at its own due
 * date (never extrapolated past it, even if `date` is later) — a loan
 * that's already closed, overdue, or has no due date just contributes its
 * current balance as-is, since projecting doesn't apply to it.
 */
export function combinedPayoff(loans: Loan[], date: string): number {
  return round2(
    loans.reduce((sum, loan) => {
      if (!isProjectable(loan)) return sum + Number(loan.balance);
      const dueDate = loan.due_date!.slice(0, 10);
      return sum + projectedPayoff(loan, date > dueDate ? dueDate : date);
    }, 0)
  );
}
