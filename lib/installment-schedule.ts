import { todayInManila } from "@/lib/format";
import type { Loan } from "@/lib/types";

export type InstallmentStatus = "paid" | "late" | "next" | "upcoming";

export interface Installment {
  n: number;
  /** "YYYY-MM-DD" */
  due: string;
  amount: number;
  status: InstallmentStatus;
  /** What's still unpaid on this one (0 when paid, the full amount when untouched). */
  remaining: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime();
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86400000);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Every installment of a loan — its due date, amount, and whether it's
 * covered — built from the same numbers and the same rules the server uses
 * for the automatic late fee: the amount is `installment_amount`
 * (an equal share of the principal plus one period's interest, 20% + interest
 * on a 5-payment plan), and payments count cumulatively, oldest installment
 * first, so paying extra early covers the next ones.
 *
 * The current `due_date` is the anchor: which installment it is comes from
 * its distance to start_date (the server's Loan::deadlineIndex()), and the
 * others are spaced one plan period apart from it.
 */
export function installmentSchedule(loan: Loan): Installment[] {
  if (!loan.installments_enabled || !loan.start_date || !loan.due_date) return [];

  const period = Math.max(1, loan.plan_period_days);
  const count = Math.max(1, loan.plan_installments);
  const amount = loan.installment_amount;
  const current = Math.max(1, Math.ceil(daysBetween(loan.start_date, loan.due_date) / period));
  const paid = Number(loan.total_paid);
  const today = todayInManila();
  let nextAssigned = false;

  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const due = addDays(loan.due_date!, (n - current) * period);
    const covered = paid - (n - 1) * amount;
    const remaining = round2(Math.min(amount, Math.max(0, amount - covered)));

    let status: InstallmentStatus;
    if (remaining <= 0.009) {
      status = "paid";
    } else if (due < today) {
      status = "late";
    } else if (!nextAssigned) {
      status = "next";
      nextAssigned = true;
    } else {
      status = "upcoming";
    }

    return { n, due, amount, status, remaining };
  });
}
