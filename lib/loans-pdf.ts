import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { formatCurrency, formatDate } from "@/lib/format";
import type { Loan } from "@/lib/types";

/**
 * jsPDF's built-in fonts (Helvetica etc.) are WinAnsi-encoded and have no
 * glyph for ₱ (U+20B1), so it silently renders as "±" — same fix as
 * lib/analytics-pdf.ts, kept as its own small copy rather than a shared
 * util for one call site each.
 */
function formatCurrencyForPdf(value: number | string): string {
  return formatCurrency(value).replace("₱", "PHP ");
}

/**
 * Client-side export of exactly what's currently loaded/filtered in the
 * admin loans table — a real, selectable-text PDF (jsPDF + jspdf-autotable,
 * same approach as lib/analytics-pdf.ts) instead of a CSV, since a table of
 * borrower/loan rows is meant to be opened and read, not imported into a
 * spreadsheet. Landscape, so a loan number, borrower, and every money
 * column fit on one line without wrapping.
 */
export function downloadLoansPdf(loans: Loan[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  const generatedAt = new Date().toLocaleString("en-PH");

  doc.setFontSize(16);
  doc.text("MELCHUB — Loans", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${generatedAt} · ${loans.length} loan${loans.length === 1 ? "" : "s"}`, 14, 24);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 30,
    head: [["Loan #", "Borrower", "Username", "Phone", "Principal", "Interest", "Paid", "Balance", "Status", "Due"]],
    body: loans.map((loan) => [
      loan.loan_number ?? "",
      loan.name,
      loan.username,
      loan.phone ?? "",
      formatCurrencyForPdf(loan.total_loan),
      formatCurrencyForPdf(loan.interest_amount),
      formatCurrencyForPdf(loan.total_paid),
      formatCurrencyForPdf(loan.balance),
      loan.is_overdue ? "overdue" : loan.status,
      formatDate(loan.due_date),
    ]),
    theme: "striped",
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 9 },
  });

  const totalInterest = loans.reduce((sum, l) => sum + Number(l.interest_amount), 0);
  const totalPenalties = loans.reduce((sum, l) => sum + Number(l.penalty_amount), 0);
  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Total interest (profit): ${formatCurrencyForPdf(totalInterest)}    ·    Late fees charged: ${formatCurrencyForPdf(totalPenalties)}`,
    14,
    afterTable + 10
  );

  doc.save(`melchub-loans-${new Date().toISOString().slice(0, 10)}.pdf`);
}
