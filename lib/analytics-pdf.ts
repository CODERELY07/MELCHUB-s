import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { formatCurrency } from "@/lib/format";
import type { AnalyticsData } from "@/lib/types";

/**
 * jsPDF's built-in fonts (Helvetica etc.) are WinAnsi-encoded and have no
 * glyph for ₱ (U+20B1), so it silently renders as "±". Swap it for "PHP "
 * only inside PDF output, where every character must exist in the font.
 */
function formatCurrencyForPdf(value: number | string): string {
  return formatCurrency(value).replace("₱", "PHP ");
}

/**
 * Builds the PDF from the same data the on-screen dashboard renders, using
 * jsPDF's own table drawing (jspdf-autotable) rather than screenshotting the
 * DOM — avoids canvas/CSS rendering pitfalls entirely and is guaranteed to
 * produce a real, selectable-text PDF every time.
 */
export function downloadAnalyticsPdf(data: AnalyticsData) {
  const doc = new jsPDF();
  const generatedAt = new Date().toLocaleString("en-PH");

  doc.setFontSize(16);
  doc.text("MELCHUB — Analytics Report", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${generatedAt}`, 14, 24);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 30,
    head: [["Metric", "Value"]],
    body: [
      ["Total borrowers", String(data.totals.loan_count)],
      ["Total loaned out", formatCurrencyForPdf(data.totals.total_loaned)],
      ["Total collected", formatCurrencyForPdf(data.totals.total_collected)],
      ["Outstanding balance", formatCurrencyForPdf(data.totals.total_outstanding)],
      ["Overdue loans", String(data.totals.overdue_count)],
      ["Active loans", String(data.totals.active_count)],
      ["Paid loans", String(data.totals.paid_count)],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 30, 30] },
  });

  const afterTotals = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    startY: afterTotals + 10,
    head: [["Status", "Count"]],
    body: data.status_breakdown.map((s) => [s.status, String(s.count)]),
    theme: "striped",
    headStyles: { fillColor: [30, 30, 30] },
  });

  const afterStatus = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    startY: afterStatus + 10,
    head: [["Month", "Loans Created", "Amount Loaned", "Amount Collected"]],
    body: data.monthly_loans.map((m, i) => [
      m.month,
      String(m.count),
      formatCurrencyForPdf(m.amount),
      formatCurrencyForPdf(data.monthly_collections[i]?.amount ?? 0),
    ]),
    theme: "striped",
    headStyles: { fillColor: [30, 30, 30] },
  });

  doc.save(`melchub-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
}
