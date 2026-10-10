"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { Loan, LoanStatus } from "@/lib/types";

const STATUS_BADGE: Record<LoanStatus, "default" | "success" | "warning" | "destructive" | "muted"> = {
  pending: "muted",
  active: "default",
  paid: "success",
  overdue: "warning",
  defaulted: "destructive",
  cancelled: "muted",
};

/** What a loan's status should read as right now: "Late" wins over "Active" once a payment is behind. */
export function effectiveStatus(loan: Pick<Loan, "status" | "is_overdue">): LoanStatus {
  return loan.is_overdue ? "overdue" : loan.status;
}

/**
 * One loan status, in the viewer's language, with the same color everywhere
 * it appears (borrower portal, admin list). Pass `status` directly for
 * summary counts that aren't tied to one loan.
 */
export function LoanStatusBadge({
  loan,
  status,
  count,
}: {
  loan?: Pick<Loan, "status" | "is_overdue">;
  status?: LoanStatus;
  count?: number;
}) {
  const { t } = useI18n();
  const value = status ?? (loan ? effectiveStatus(loan) : "active");
  const label = t(`status.${value}`);

  return <Badge variant={STATUS_BADGE[value]}>{count !== undefined ? `${count} ${label}` : label}</Badge>;
}
