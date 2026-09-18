import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LoanHistoryEntry } from "@/lib/types";

export function LoanHistoryTable({ entries }: { entries: LoanHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No history yet.
      </p>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry, i) => (
            <tr key={i}>
              <td className="whitespace-nowrap px-3 py-2">
                {formatDate(entry.date)}
              </td>
              <td className="px-3 py-2">
                {entry.type === "interest" ? (
                  <span>Day {entry.day} interest</span>
                ) : (
                  <div>
                    <Badge variant="success">Payment</Badge>
                    {entry.note && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {entry.note}
                      </div>
                    )}
                    {entry.recorded_by && (
                      <div className="text-xs text-muted-foreground">
                        Recorded by {entry.recorded_by}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-medium",
                  entry.type === "payment" ? "text-success" : "text-muted-foreground"
                )}
              >
                {entry.type === "payment" ? "-" : "+"}
                {formatCurrency(entry.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
