"use client";

import { Fragment } from "react";
import {
  Banknote,
  Bell,
  ChevronRight,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Loan, LoanStatus } from "@/lib/types";

const CLOSED: LoanStatus[] = ["paid", "cancelled", "defaulted"];

const STATUS_BADGE: Record<LoanStatus, "default" | "success" | "warning" | "destructive" | "muted"> = {
  pending: "muted",
  active: "default",
  paid: "success",
  overdue: "warning",
  defaulted: "destructive",
  cancelled: "muted",
};

/** One person and every loan they have — the unit the admin Loans page lists. */
export interface BorrowerGroup {
  borrowerId: number;
  name: string;
  username: string | null;
  phone: string | null;
  loans: Loan[];
}

export interface LoanHandlers {
  notifyingId: number | null;
  deletingId: number | null;
  onNotify: (loan: Loan) => void;
  onMessage: (loan: Loan) => void;
  onPayment: (loan: Loan) => void;
  onHistory: (loan: Loan) => void;
  onEdit: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
}

interface AdminLoansListProps {
  groups: BorrowerGroup[];
  isOpen: (borrowerId: number) => boolean;
  onToggle: (borrowerId: number) => void;
  onNewLoan: (borrowerId: number) => void;
  handlers: LoanHandlers;
}

const effectiveStatus = (loan: Loan): LoanStatus => (loan.is_overdue ? "overdue" : loan.status);

/**
 * A group's totals cover its OPEN loans only (same rule as the Dashboard's
 * money cards): a loan that's paid, cancelled or defaulted is finished, so
 * counting it would make a long-time borrower with five old paid-off loans
 * look like they owe or hold far more than they do.
 */
function summarize(group: BorrowerGroup) {
  const open = group.loans.filter((l) => !CLOSED.includes(l.status));
  const sum = (pick: (l: Loan) => number) => open.reduce((total, l) => total + pick(l), 0);

  const counts = new Map<LoanStatus, number>();
  for (const loan of group.loans) {
    counts.set(effectiveStatus(loan), (counts.get(effectiveStatus(loan)) ?? 0) + 1);
  }

  const dues = open.map((l) => l.due_date).filter((d): d is string => Boolean(d)).sort();

  return {
    openCount: open.length,
    principal: sum((l) => Number(l.total_loan)),
    interest: sum((l) => Number(l.interest_amount)),
    paid: sum((l) => Number(l.total_paid)),
    balance: sum((l) => Number(l.balance)),
    behind: sum((l) => Number(l.past_due_amount ?? 0)),
    counts: [...counts.entries()],
    nextDue: dues[0] ?? null,
  };
}

function LoanActions({ loan, handlers, size }: { loan: Loan; handlers: LoanHandlers; size: "sm" | "lg" }) {
  const buttonSize = size === "sm" ? "icon-sm" : "icon-lg";
  const icon = size === "sm" ? "size-3.5" : "size-4";
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <>
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={stop(() => handlers.onNotify(loan))}
        disabled={handlers.notifyingId === loan.id || !loan.phone}
        aria-label={`Notify ${loan.name}`}
        title={loan.phone ? undefined : "No phone number on file"}
      >
        {handlers.notifyingId === loan.id ? <Loader2 className={cn(icon, "animate-spin")} /> : <Bell className={icon} />}
      </Button>
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={stop(() => handlers.onMessage(loan))}
        disabled={!loan.phone}
        aria-label={`Message ${loan.name}`}
        title={loan.phone ? undefined : "No phone number on file"}
      >
        <MessageSquare className={icon} />
      </Button>
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={stop(() => handlers.onPayment(loan))}
        aria-label={`Record payment for ${loan.loan_number}`}
      >
        <Banknote className={icon} />
      </Button>
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={stop(() => handlers.onHistory(loan))}
        aria-label={`View history for ${loan.loan_number}`}
      >
        <History className={icon} />
      </Button>
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={stop(() => handlers.onEdit(loan))}
        aria-label={`Edit ${loan.loan_number}`}
      >
        <Pencil className={icon} />
      </Button>
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={stop(() => handlers.onDelete(loan))}
        disabled={handlers.deletingId === loan.id}
        aria-label={`Delete ${loan.loan_number}`}
      >
        {handlers.deletingId === loan.id ? <Loader2 className={cn(icon, "animate-spin")} /> : <Trash2 className={icon} />}
      </Button>
    </>
  );
}

function StatusSummary({ counts }: { counts: [LoanStatus, number][] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {counts.map(([status, count]) => (
        <Badge key={status} variant={STATUS_BADGE[status]}>
          {count} {status}
        </Badge>
      ))}
    </div>
  );
}

/** Small facts about how one loan is set up — what the admin would otherwise have to open Edit to see. */
function loanTraits(loan: Loan): string {
  const traits = [loan.plan_name ?? "No plan"];
  if (loan.compounds_interest) traits.push("compounding");
  if (loan.installments_enabled && loan.auto_penalty) traits.push("auto late fee");
  return traits.join(" · ");
}

export function AdminLoansList({ groups, isOpen, onToggle, onNewLoan, handlers }: AdminLoansListProps) {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Each person is listed once, totaling their open loans. Click a person to see every loan they have.
      </p>

      {/* Table — md and up, where there's room for every column at once */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Loan</th>
              <th className="px-3 py-2 font-medium">Borrower</th>
              <th className="px-3 py-2 font-medium">Principal</th>
              <th className="px-3 py-2 font-medium">Interest</th>
              <th className="px-3 py-2 font-medium">Paid</th>
              <th className="px-3 py-2 font-medium">Balance</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Next due</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const totals = summarize(group);
              const open = isOpen(group.borrowerId);
              const hasLoans = group.loans.length > 0;

              return (
                <Fragment key={group.borrowerId}>
                  <tr
                    className={cn("border-t border-border bg-muted/20", hasLoans && "cursor-pointer hover:bg-muted/40")}
                    onClick={hasLoans ? () => onToggle(group.borrowerId) : undefined}
                  >
                    <td className="px-3 py-2.5">
                      {hasLoans ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs font-medium"
                          aria-expanded={open}
                          aria-label={`${open ? "Hide" : "Show"} loans for ${group.name}`}
                        >
                          <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
                          {group.loans.length} loan{group.loans.length === 1 ? "" : "s"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No loans yet</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={group.name} />
                        <div>
                          <div className="font-medium">{group.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {group.username ? `@${group.username}` : "No login"}
                            {group.phone ? ` · ${group.phone}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium">{hasLoans ? formatCurrency(totals.principal) : "—"}</td>
                    <td className="px-3 py-2.5 font-medium text-success-ink">
                      {hasLoans ? formatCurrency(totals.interest) : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{hasLoans ? formatCurrency(totals.paid) : "—"}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {hasLoans ? formatCurrency(totals.balance) : "—"}
                      {totals.behind > 0 && (
                        <div className="text-xs font-normal text-warning-ink">Behind {formatCurrency(totals.behind)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{hasLoans && <StatusSummary counts={totals.counts} />}</td>
                    <td className="px-3 py-2.5">{formatDate(totals.nextDue)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNewLoan(group.borrowerId);
                          }}
                        >
                          <Plus className="size-3.5" />
                          New loan
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {open &&
                    group.loans.map((loan) => (
                      <tr key={loan.id} className="border-t border-border/60 bg-background">
                        <td className="py-2 pr-3 pl-9 font-mono text-xs">{loan.loan_number}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{loanTraits(loan)}</td>
                        <td className="px-3 py-2">{formatCurrency(loan.total_loan)}</td>
                        <td className="px-3 py-2 text-success-ink">{formatCurrency(loan.interest_amount)}</td>
                        <td className="px-3 py-2">{formatCurrency(loan.total_paid)}</td>
                        <td className="px-3 py-2">
                          {formatCurrency(loan.balance)}
                          {loan.past_due_amount > 0 && (
                            <div className="text-xs text-warning-ink">Behind {formatCurrency(loan.past_due_amount)}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={STATUS_BADGE[loan.status]}>{effectiveStatus(loan)}</Badge>
                        </td>
                        <td className="px-3 py-2">{formatDate(loan.due_date)}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <LoanActions loan={loan} handlers={handlers} size="sm" />
                          </div>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards — below md, where a 900px-wide table would only mean sideways scrolling */}
      <div className="flex flex-col gap-3 md:hidden">
        {groups.map((group) => {
          const totals = summarize(group);
          const open = isOpen(group.borrowerId);
          const hasLoans = group.loans.length > 0;

          return (
            <Card key={group.borrowerId}>
              <CardContent className="flex flex-col gap-3 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={group.name} />
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.username ? `@${group.username}` : "No login"}
                        {group.phone ? ` · ${group.phone}` : ""}
                      </div>
                    </div>
                  </div>
                  {hasLoans && <StatusSummary counts={totals.counts} />}
                </div>

                {hasLoans ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Principal</div>
                        <div className="font-medium">{formatCurrency(totals.principal)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Interest</div>
                        <div className="font-medium">{formatCurrency(totals.interest)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="font-medium">{formatCurrency(totals.paid)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Balance</div>
                        <div className="font-medium">{formatCurrency(totals.balance)}</div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {totals.openCount} open of {group.loans.length} · next due {formatDate(totals.nextDue)}
                      {totals.behind > 0 && (
                        <span className="text-warning-ink"> · behind {formatCurrency(totals.behind)}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No loans yet.</p>
                )}

                <div className="flex gap-2 border-t border-border pt-3">
                  {hasLoans && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => onToggle(group.borrowerId)}
                      aria-expanded={open}
                    >
                      <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
                      {open ? "Hide loans" : `Show ${group.loans.length} loan${group.loans.length === 1 ? "" : "s"}`}
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => onNewLoan(group.borrowerId)}>
                    <Plus className="size-4" />
                    New loan
                  </Button>
                </div>

                {open &&
                  group.loans.map((loan) => (
                    <div key={loan.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-xs">{loan.loan_number}</div>
                          <div className="text-xs text-muted-foreground">{loanTraits(loan)}</div>
                        </div>
                        <Badge variant={STATUS_BADGE[loan.status]}>{effectiveStatus(loan)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Principal</div>
                          <div className="font-medium">{formatCurrency(loan.total_loan)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Interest</div>
                          <div className="font-medium">{formatCurrency(loan.interest_amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Paid</div>
                          <div className="font-medium">{formatCurrency(loan.total_paid)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Balance</div>
                          <div className="font-medium">{formatCurrency(loan.balance)}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Next due {formatDate(loan.due_date)}
                        {loan.past_due_amount > 0 && (
                          <span className="text-warning-ink"> · behind {formatCurrency(loan.past_due_amount)}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                        <LoanActions loan={loan} handlers={handlers} size="lg" />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
