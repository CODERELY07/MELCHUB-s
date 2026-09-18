import { formatDate } from "@/lib/format";
import type { Loan } from "@/lib/types";

const HEADERS = [
  "Loan #",
  "Name",
  "Username",
  "Email",
  "Phone",
  "Location",
  "Principal",
  "Total Paid",
  "Interest Rate (%/day)",
  "Balance",
  "Status",
  "Start Date",
  "Due Date",
] as const;

/**
 * Minimal RFC 4180 escaping — wrap in quotes and double up any quote inside
 * whenever the value contains a comma, quote, or newline. Plain numbers and
 * most names never need it, but borrower-entered fields (notes-adjacent
 * things like location) can contain commas.
 */
function csvCell(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Client-side export of exactly what's currently loaded/filtered in the
 * admin loans table — row-level data for bookkeeping, distinct from the
 * aggregated PDF report on the Analytics page (see lib/analytics-pdf.ts).
 */
export function downloadLoansCsv(loans: Loan[]) {
  const rows = loans.map((loan) => [
    loan.loan_number ?? "",
    loan.name,
    loan.username,
    loan.email ?? "",
    loan.phone ?? "",
    loan.location ?? "",
    loan.total_loan,
    loan.total_paid,
    loan.interest_rate,
    loan.balance,
    loan.is_overdue ? "overdue" : loan.status,
    formatDate(loan.start_date),
    formatDate(loan.due_date),
  ]);

  const csv = [HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  // Leading BOM so Excel (still the most likely consumer of a bookkeeping
  // export like this) detects UTF-8 instead of mis-rendering the ₱ symbol
  // and other non-ASCII characters as garbled text.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `melchub-loans-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
