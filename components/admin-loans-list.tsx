"use client";

import { Fragment } from "react";
import { Banknote, Bell, ChevronRight, History, Loader2, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoanStatusBadge, effectiveStatus } from "@/components/loan-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Loan, LoanStatus } from "@/lib/types";

const CLOSED: LoanStatus[] = ["paid", "cancelled", "defaulted"];

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

/** Actions on the person as a whole — one text / one payment covering all their open loans. */
export interface PersonHandlers {
  remindingId: number | null;
  onRemind: (group: BorrowerGroup) => void;
  onPayment: (group: BorrowerGroup) => void;
}

interface AdminLoansListProps {
  groups: BorrowerGroup[];
  isOpen: (borrowerId: number) => boolean;
  onToggle: (borrowerId: number) => void;
  onNewLoan: (borrowerId: number) => void;
  handlers: LoanHandlers;
  person: PersonHandlers;
}

/**
 * A group's totals cover its OPEN loans only (same rule as the Dashboard's
 * money cards): a paid-off loan is finished, so counting it would make a
 * long-time borrower look like they owe far more than they do.
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
    balance: sum((l) => Math.max(0, Number(l.balance))),
    behind: sum((l) => Number(l.past_due_amount ?? 0)),
    counts: [...counts.entries()],
    nextDue: dues[0] ?? null,
  };
}

function LoanActions({ loan, handlers, size }: { loan: Loan; handlers: LoanHandlers; size: "sm" | "lg" }) {
  const { t } = useI18n();
  const buttonSize = size === "sm" ? "icon-sm" : "icon-lg";
  const icon = size === "sm" ? "size-3.5" : "size-4";
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const noPhone = t("loans.noPhone");

  // Icon-only to keep rows compact, but every one has a tooltip and a
  // screen-reader name saying exactly what it does.
  const actions = [
    {
      key: "notify",
      label: t("loans.actionRemind"),
      icon: handlers.notifyingId === loan.id ? <Loader2 className={cn(icon, "animate-spin")} /> : <Bell className={icon} />,
      onClick: () => handlers.onNotify(loan),
      disabled: handlers.notifyingId === loan.id || !loan.phone,
      title: loan.phone ? t("loans.actionRemind") : noPhone,
    },
    {
      key: "message",
      label: t("loans.actionText"),
      icon: <MessageSquare className={icon} />,
      onClick: () => handlers.onMessage(loan),
      disabled: !loan.phone,
      title: loan.phone ? t("loans.actionText") : noPhone,
    },
    {
      key: "payment",
      label: t("loans.actionPayment"),
      icon: <Banknote className={icon} />,
      onClick: () => handlers.onPayment(loan),
    },
    {
      key: "history",
      label: t("loans.actionHistory"),
      icon: <History className={icon} />,
      onClick: () => handlers.onHistory(loan),
    },
    {
      key: "edit",
      label: t("loans.actionEdit"),
      icon: <Pencil className={icon} />,
      onClick: () => handlers.onEdit(loan),
    },
    {
      key: "delete",
      label: t("loans.actionDelete"),
      icon:
        handlers.deletingId === loan.id ? <Loader2 className={cn(icon, "animate-spin")} /> : <Trash2 className={icon} />,
      onClick: () => handlers.onDelete(loan),
      disabled: handlers.deletingId === loan.id,
    },
  ];

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.key}
          variant="ghost"
          size={buttonSize}
          onClick={stop(action.onClick)}
          disabled={action.disabled}
          aria-label={`${action.label} — ${loan.loan_number}`}
          title={action.title ?? action.label}
          className={action.key === "delete" ? "text-destructive hover:text-destructive" : undefined}
        >
          {action.icon}
        </Button>
      ))}
    </>
  );
}

function StatusSummary({ counts }: { counts: [LoanStatus, number][] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {counts.map(([status, count]) => (
        <LoanStatusBadge key={status} status={status} count={count} />
      ))}
    </div>
  );
}

export function AdminLoansList({ groups, isOpen, onToggle, onNewLoan, handlers, person }: AdminLoansListProps) {
  const { t } = useI18n();

  /** Remind + Payment for the whole person — only once they have something unpaid. */
  const personActions = (group: BorrowerGroup, openCount: number, compact: boolean) => {
    if (openCount === 0) return null;
    const reminding = person.remindingId === group.borrowerId;
    const remindTitle = group.phone ? t("loans.personRemind", { name: group.name }) : t("loans.noPhone");

    return (
      <>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={compact ? undefined : "flex-1"}
          disabled={reminding || !group.phone}
          title={remindTitle}
          aria-label={remindTitle}
          onClick={(e) => {
            e.stopPropagation();
            person.onRemind(group);
          }}
        >
          {reminding ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
          {t("loans.personRemindShort")}
        </Button>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={compact ? undefined : "flex-1"}
          title={t("loans.personPay", { name: group.name })}
          aria-label={t("loans.personPay", { name: group.name })}
          onClick={(e) => {
            e.stopPropagation();
            person.onPayment(group);
          }}
        >
          <Banknote className="size-3.5" />
          {t("loans.personPayShort")}
        </Button>
      </>
    );
  };

  /** Small facts about how one loan is set up — what the admin would otherwise have to open Edit to see. */
  const loanTraits = (loan: Loan): string => {
    const traits = [loan.installments_enabled ? (loan.plan_name ?? t("loans.traitInstallments")) : t("loans.traitOneTime")];
    if (loan.compounds_interest) traits.push(t("loans.traitCompounding"));
    if (loan.installments_enabled && loan.auto_penalty) traits.push(t("loans.traitAutoFee"));
    return traits.join(" · ");
  };

  const loansCount = (n: number) => (n === 1 ? t("loans.oneLoan") : t("loans.manyLoans", { count: n }));

  return (
    <>
      <p className="text-xs text-muted-foreground">{t("loans.listHint")}</p>

      {/* Table — md and up, where there's room for every column at once */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{t("loans.colLoan")}</th>
              <th className="px-3 py-2 font-medium">{t("loans.colBorrower")}</th>
              <th className="px-3 py-2 font-medium">{t("loans.colBorrowed")}</th>
              <th className="px-3 py-2 font-medium">{t("loans.colInterest")}</th>
              <th className="px-3 py-2 font-medium">{t("loans.colPaid")}</th>
              <th className="px-3 py-2 font-medium">{t("loans.colOwed")}</th>
              <th className="px-3 py-2 font-medium">{t("loans.colStatus")}</th>
              <th className="px-3 py-2 font-medium">{t("loans.colNextDue")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("loans.colActions")}</th>
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
                          aria-label={open ? t("loans.hideLoansOf", { name: group.name }) : t("loans.showLoansOf", { name: group.name })}
                        >
                          <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
                          {loansCount(group.loans.length)}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("loans.noLoansYet")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={group.name} />
                        <div>
                          <div className="font-medium">{group.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {group.username ? `@${group.username}` : t("common.noLogin")}
                            {group.phone ? ` · ${group.phone}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium tabular-nums">{hasLoans ? formatCurrency(totals.principal) : "—"}</td>
                    <td className="px-3 py-2.5 font-medium tabular-nums text-success-ink">
                      {hasLoans ? formatCurrency(totals.interest) : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium tabular-nums">{hasLoans ? formatCurrency(totals.paid) : "—"}</td>
                    <td className="px-3 py-2.5 font-medium tabular-nums">
                      {hasLoans ? formatCurrency(totals.balance) : "—"}
                      {totals.behind > 0 && (
                        <div className="text-xs font-normal text-destructive">
                          {t("loans.behind", { amount: formatCurrency(totals.behind) })}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{hasLoans && <StatusSummary counts={totals.counts} />}</td>
                    <td className="px-3 py-2.5">{formatDate(totals.nextDue)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        {personActions(group, totals.openCount, true)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNewLoan(group.borrowerId);
                          }}
                        >
                          <Plus className="size-3.5" />
                          {t("loans.newLoan")}
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {open &&
                    group.loans.map((loan) => (
                      <tr key={loan.id} className="border-t border-border/60 bg-background">
                        <td className="py-2 pr-3 pl-9 font-mono text-xs">{loan.loan_number}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{loanTraits(loan)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCurrency(loan.total_loan)}</td>
                        <td className="px-3 py-2 tabular-nums text-success-ink">{formatCurrency(loan.interest_amount)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCurrency(loan.total_paid)}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatCurrency(Math.max(0, loan.balance))}
                          {loan.past_due_amount > 0 && (
                            <div className="text-xs text-destructive">
                              {t("loans.behind", { amount: formatCurrency(loan.past_due_amount) })}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <LoanStatusBadge loan={loan} />
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
                        {group.username ? `@${group.username}` : t("common.noLogin")}
                        {group.phone ? ` · ${group.phone}` : ""}
                      </div>
                    </div>
                  </div>
                  {hasLoans && <StatusSummary counts={totals.counts} />}
                </div>

                {hasLoans ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">{t("loans.colBorrowed")}</div>
                        <div className="font-medium tabular-nums">{formatCurrency(totals.principal)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("loans.colInterest")}</div>
                        <div className="font-medium tabular-nums">{formatCurrency(totals.interest)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("loans.colPaid")}</div>
                        <div className="font-medium tabular-nums">{formatCurrency(totals.paid)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("loans.colOwed")}</div>
                        <div className="font-medium tabular-nums">{formatCurrency(totals.balance)}</div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {t("loans.openSummary", {
                        open: totals.openCount,
                        total: group.loans.length,
                        date: formatDate(totals.nextDue),
                      })}
                      {totals.behind > 0 && (
                        <span className="text-destructive"> · {t("loans.behind", { amount: formatCurrency(totals.behind) })}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("loans.noLoansYet")}</p>
                )}

                {totals.openCount > 0 && (
                  <div className="flex gap-2">{personActions(group, totals.openCount, false)}</div>
                )}

                <div className="flex gap-2 border-t border-border pt-3">
                  {hasLoans && (
                    <Button variant="outline" className="flex-1" onClick={() => onToggle(group.borrowerId)} aria-expanded={open}>
                      <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
                      {open ? t("loans.hideLoans") : t("loans.showLoans", { count: group.loans.length })}
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => onNewLoan(group.borrowerId)}>
                    <Plus className="size-4" />
                    {t("loans.newLoan")}
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
                        <LoanStatusBadge loan={loan} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">{t("loans.colBorrowed")}</div>
                          <div className="font-medium tabular-nums">{formatCurrency(loan.total_loan)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t("loans.colInterest")}</div>
                          <div className="font-medium tabular-nums">{formatCurrency(loan.interest_amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t("loans.colPaid")}</div>
                          <div className="font-medium tabular-nums">{formatCurrency(loan.total_paid)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t("loans.colOwed")}</div>
                          <div className="font-medium tabular-nums">{formatCurrency(Math.max(0, loan.balance))}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("loans.nextDueOn", { date: formatDate(loan.due_date) })}
                        {loan.past_due_amount > 0 && (
                          <span className="text-destructive"> · {t("loans.behind", { amount: formatCurrency(loan.past_due_amount) })}</span>
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
