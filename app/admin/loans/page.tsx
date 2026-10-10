"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BellRing, ChevronsDownUp, ChevronsUpDown, Download, Loader2, Plus, Search } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import { LOGIN_PATH } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminLoansList, type BorrowerGroup } from "@/components/admin-loans-list";
import { LoanHistoryTable } from "@/components/loan-history-table";
import { PaymentSplitPreview } from "@/components/payment-split-preview";
import { payableLoans, totalDueNow, totalOwed } from "@/lib/allocate-payment";
import { formatCurrency, toDateInputValue, todayInManila } from "@/lib/format";
import { downloadLoansPdf } from "@/lib/loans-pdf";
import { useRepaymentPlans } from "@/lib/use-repayment-plans";
import type {
  Borrower,
  Loan,
  LoanFormValues,
  LoanHistoryEntry,
  LoanStatus,
  PaymentAllocation,
  RepaymentPlanRecord,
  SmsLogEntry,
} from "@/lib/types";

const STATUS_OPTIONS: LoanStatus[] = ["pending", "active", "paid", "overdue", "defaulted", "cancelled"];

/** "open" = active + late — what the owner works on day to day, so it's what the page opens on. */
type StatusFilter = LoanStatus | "open" | "";

const EMPTY_FORM: LoanFormValues = {
  name: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  location: "",
  total_loan: "",
  credit_limit: "",
  total_paid: "0",
  interest_rate: "0",
  compounds_interest: true,
  repayment_plan: "weekly",
  installments_enabled: true,
  auto_penalty: true,
  status: "active",
  notes: "",
  start_date: "",
  due_date: "",
};

/**
 * First deadline for a new loan: the start date plus one of the chosen
 * plan's periods (a weekly plan = 7 days later). Keeps the Due date field
 * filled in sensibly instead of leaving the admin to count days by hand —
 * the admin can still overwrite it, after which this stops touching it.
 */
function computeDue(start: string, planKey: string, plans: RepaymentPlanRecord[] | null): string | null {
  const days = plans?.find((p) => p.key === planKey)?.period_days;
  if (!start || !days) return null;

  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/** A form section with a plain heading, so the long loan form reads as a few short steps. */
function FormSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-sm font-semibold">
        {title}
        {hint && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2 text-sm ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 rounded border-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

export default function AdminLoansPage() {
  const { t } = useI18n();
  const plans = useRepaymentPlans("staff");
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);
  // Only relevant while creating (not editing): give a brand-new person a
  // first loan, or give someone who already has an account another one.
  const [borrowerMode, setBorrowerMode] = useState<"new" | "existing">("new");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<number | "">("");
  // Off for a borrower who'll never use the portal — just a name to track a
  // loan against, no username/password needed at all.
  const [needsLogin, setNeedsLogin] = useState(true);
  // Once the admin types their own due date, stop auto-filling it from the
  // start date + plan.
  const [dueManual, setDueManual] = useState(false);
  // Which people are expanded to show their individual loans.
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState<LoanFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null);
  const [historyEntries, setHistoryEntries] = useState<LoanHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [smsLog, setSmsLog] = useState<SmsLogEntry[] | null>(null);
  const [smsLogError, setSmsLogError] = useState("");

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "" });
  const [paymentError, setPaymentError] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // One payment for all of a person's loans, split on the server.
  const [personPayGroup, setPersonPayGroup] = useState<BorrowerGroup | null>(null);
  const [personPayLoans, setPersonPayLoans] = useState<Loan[] | null>(null);
  const [personPayForm, setPersonPayForm] = useState({ amount: "", note: "" });
  const [personPayError, setPersonPayError] = useState("");
  const [savingPersonPay, setSavingPersonPay] = useState(false);
  const [remindingPersonId, setRemindingPersonId] = useState<number | null>(null);

  const [notifyingId, setNotifyingId] = useState<number | null>(null);
  const [notifyingAll, setNotifyingAll] = useState(false);
  const [notifyResult, setNotifyResult] = useState("");
  const [notifyError, setNotifyError] = useState("");

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageLoan, setMessageLoan] = useState<Loan | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageError, setMessageError] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const router = useRouter();

  const totalInterest = (loans ?? []).reduce((sum, l) => sum + Number(l.interest_amount), 0);
  const totalPenalties = (loans ?? []).reduce((sum, l) => sum + Number(l.penalty_amount), 0);
  // The default "active and late" view isn't a narrowing filter from the
  // owner's point of view — it's just the normal view.
  const isNarrowed = Boolean(search) || (statusFilter !== "" && statusFilter !== "open");

  // One entry per person, newest-loan first. People with no loans yet are
  // included in the normal view (so a freshly added client doesn't seem to
  // vanish), but not while searching or looking at one specific status.
  const groups = useMemo<BorrowerGroup[]>(() => {
    const map = new Map<number, BorrowerGroup>();

    for (const loan of loans ?? []) {
      const group = map.get(loan.borrower_id) ?? {
        borrowerId: loan.borrower_id,
        name: loan.name,
        username: loan.username,
        phone: loan.phone,
        loans: [],
      };
      group.loans.push(loan);
      map.set(loan.borrower_id, group);
    }

    if (!isNarrowed) {
      for (const borrower of borrowers ?? []) {
        // Only people with no loans at all (new clients waiting for their
        // first one) — not people whose loans are all finished.
        if (!map.has(borrower.id) && (borrower.loans_count ?? 0) === 0) {
          map.set(borrower.id, {
            borrowerId: borrower.id,
            name: borrower.name,
            username: borrower.username,
            phone: borrower.phone,
            loans: [],
          });
        }
      }
    }

    return [...map.values()];
  }, [loans, borrowers, isNarrowed]);

  // While searching/filtering, everything is expanded — the point of a
  // search is to see the matching loans, not to click through to them.
  const isOpen = (borrowerId: number) => isNarrowed || openIds.has(borrowerId);
  const expandable = groups.filter((g) => g.loans.length > 0);
  const allOpen = expandable.length > 0 && expandable.every((g) => openIds.has(g.borrowerId));

  const toggleGroup = (borrowerId: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(borrowerId)) next.delete(borrowerId);
      else next.add(borrowerId);
      return next;
    });

  const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(expandable.map((g) => g.borrowerId)));

  const loadBorrowers = useCallback(() => {
    api
      .get("/borrowers")
      .then((res) => setBorrowers(res.data))
      .catch(() => setBorrowers([]));
  }, []);

  useEffect(() => {
    loadBorrowers();
  }, [loadBorrowers]);

  const loadLoans = useCallback(() => {
    api
      .get("/loans", { params: { search: search || undefined, status: statusFilter || undefined } })
      .then((res) => {
        setLoans(res.data);
        setError("");
      })
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push(LOGIN_PATH);
          return;
        }
        setError(t("loans.loadError"));
      });
  }, [router, search, statusFilter, t]);

  useEffect(() => {
    // Debounced so typing in the search box doesn't fire a request per
    // keystroke — status-filter changes are infrequent clicks, so the same
    // short delay there is imperceptible.
    const timeout = setTimeout(loadLoans, 300);
    return () => clearTimeout(timeout);
  }, [loadLoans]);

  const openCreateModal = (borrowerId?: number) => {
    setEditingLoan(null);
    const start = todayInManila();
    setForm({
      ...EMPTY_FORM,
      start_date: start,
      due_date: computeDue(start, EMPTY_FORM.repayment_plan, plans) ?? "",
    });
    setDueManual(false);
    // "New loan" on a person's row jumps straight to giving *them* one.
    setBorrowerMode(borrowerId ? "existing" : "new");
    setSelectedBorrowerId(borrowerId ?? "");
    setNeedsLogin(true);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setDueManual(true);
    setNeedsLogin(loan.username !== null);
    setForm({
      name: loan.name,
      username: loan.username ?? "",
      email: loan.email ?? "",
      password: "",
      phone: loan.phone ?? "",
      location: loan.location ?? "",
      total_loan: loan.total_loan,
      credit_limit: loan.credit_limit ?? "",
      total_paid: loan.total_paid,
      interest_rate: loan.interest_rate,
      compounds_interest: loan.compounds_interest ?? true,
      repayment_plan: loan.repayment_plan ?? "weekly",
      installments_enabled: loan.installments_enabled ?? true,
      auto_penalty: loan.auto_penalty ?? false,
      status: loan.status,
      notes: loan.notes ?? "",
      start_date: toDateInputValue(loan.start_date),
      due_date: toDateInputValue(loan.due_date),
    });
    setFormError("");
    setModalOpen(true);
  };

  // Creating a loan: keep Due date following Start date + plan until the
  // admin picks one themselves. Never touches an existing loan's dates.
  const withAutoDue = (next: LoanFormValues): LoanFormValues => {
    if (editingLoan || dueManual) return next;
    const due = computeDue(next.start_date, next.repayment_plan, plans);
    return due ? { ...next, due_date: due } : next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    if (!payload.password) delete payload.password;

    // No portal login for this borrower — send blank rather than whatever
    // was previously typed into a now-hidden field.
    if (!needsLogin && (borrowerMode === "new" || !!editingLoan)) {
      payload.username = "";
      delete payload.password;
    }

    if (!editingLoan && borrowerMode === "existing") {
      if (!selectedBorrowerId) {
        setFormError(t("loans.errorPickBorrower"));
        setSaving(false);
        return;
      }
      // Loan-terms only — identity fields don't apply to an existing borrower.
      delete payload.name;
      delete payload.username;
      delete payload.email;
      delete payload.password;
      delete payload.phone;
      delete payload.location;
      delete payload.credit_limit;
      payload.borrower_id = selectedBorrowerId;
    }

    try {
      if (editingLoan) {
        await api.put(`/loans/${editingLoan.id}`, payload);
      } else {
        await api.post("/loans", payload);
        loadBorrowers();
      }
      setModalOpen(false);
      loadLoans();
    } catch (err: unknown) {
      const responseData = isAxiosError(err) ? err.response?.data : undefined;
      const messages = responseData?.errors as Record<string, string[]> | undefined;
      setFormError(messages ? Object.values(messages).flat().join(" ") : responseData?.message || t("loans.errorSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loan: Loan) => {
    if (!window.confirm(t("loans.confirmDelete", { number: loan.loan_number ?? "", name: loan.name }))) {
      return;
    }

    setDeletingId(loan.id);
    try {
      await api.delete(`/loans/${loan.id}`);
      loadLoans();
    } catch {
      setError(t("loans.errorDelete"));
    } finally {
      setDeletingId(null);
    }
  };

  const openHistoryModal = (loan: Loan) => {
    setHistoryLoan(loan);
    setHistoryEntries(null);
    setHistoryError("");
    setSmsLog(null);
    setSmsLogError("");
    setHistoryModalOpen(true);

    api
      .get(`/loans/${loan.id}/history`)
      .then((res) => setHistoryEntries(res.data))
      .catch(() => setHistoryError(t("loans.errorHistory")));

    api
      .get(`/loans/${loan.id}/sms-log`)
      .then((res) => setSmsLog(res.data))
      .catch(() => setSmsLogError(t("loans.errorSmsLog")));
  };

  const handleRemovePenalty = async (entry: LoanHistoryEntry) => {
    if (!historyLoan || !entry.id) return;
    if (
      !window.confirm(
        t("loans.confirmRemoveFee", { amount: formatCurrency(entry.amount), number: historyLoan.loan_number ?? "" })
      )
    ) {
      return;
    }

    setHistoryError("");
    try {
      await api.delete(`/loans/${historyLoan.id}/penalties/${entry.id}`);
      const res = await api.get(`/loans/${historyLoan.id}/history`);
      setHistoryEntries(res.data);
      loadLoans();
    } catch {
      setHistoryError(t("loans.errorRemoveFee"));
    }
  };

  const openPaymentModal = (loan: Loan) => {
    setPaymentLoan(loan);
    setPaymentForm({ amount: "", note: "" });
    setPaymentError("");
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLoan) return;

    setPaymentError("");
    setSavingPayment(true);

    try {
      await api.post(`/loans/${paymentLoan.id}/payments`, paymentForm);
      setPaymentModalOpen(false);
      loadLoans();
    } catch (err: unknown) {
      const responseData = isAxiosError(err) ? err.response?.data : undefined;
      const messages = responseData?.errors as Record<string, string[]> | undefined;
      setPaymentError(messages ? Object.values(messages).flat().join(" ") : responseData?.message || t("loans.errorPayment"));
    } finally {
      setSavingPayment(false);
    }
  };

  const openPersonPayment = (group: BorrowerGroup) => {
    setPersonPayGroup(group);
    setPersonPayLoans(null);
    setPersonPayForm({ amount: "", note: "" });
    setPersonPayError("");

    // Fetched fresh rather than taken from the list: the list may be
    // filtered, and the split must use every unpaid loan.
    api
      .get(`/borrowers/${group.borrowerId}/open-loans`)
      .then((res) => setPersonPayLoans(payableLoans(res.data)))
      .catch(() => setPersonPayError(t("loans.errorPersonLoans")));
  };

  const handlePersonPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personPayGroup) return;

    setPersonPayError("");
    setSavingPersonPay(true);

    try {
      const res = await api.post(`/borrowers/${personPayGroup.borrowerId}/payments`, personPayForm);
      const allocation = res.data.allocation as PaymentAllocation[];
      setNotifyError("");
      setNotifyResult(
        t("loans.personPaySaved", {
          name: personPayGroup.name,
          amount: formatCurrency(Number(personPayForm.amount)),
          list: allocation.map((a) => `${a.loan_number} ${formatCurrency(a.amount)}`).join(", "),
        })
      );
      setPersonPayGroup(null);
      loadLoans();
    } catch (err: unknown) {
      const responseData = isAxiosError(err) ? err.response?.data : undefined;
      const messages = responseData?.errors as Record<string, string[]> | undefined;
      setPersonPayError(messages ? Object.values(messages).flat().join(" ") : responseData?.message || t("loans.errorPayment"));
    } finally {
      setSavingPersonPay(false);
    }
  };

  const handlePersonRemind = async (group: BorrowerGroup) => {
    setNotifyResult("");
    setNotifyError("");
    setRemindingPersonId(group.borrowerId);

    try {
      await api.post(`/borrowers/${group.borrowerId}/notify`);
      setNotifyResult(t("loans.remindedPerson", { name: group.name }));
    } catch (err: unknown) {
      setNotifyError((isAxiosError(err) && err.response?.data?.message) || t("loans.errorRemind"));
    } finally {
      setRemindingPersonId(null);
    }
  };

  const handleNotify = async (loan: Loan) => {
    setNotifyResult("");
    setNotifyError("");
    setNotifyingId(loan.id);

    try {
      await api.post(`/loans/${loan.id}/notify`);
      setNotifyResult(t("loans.remindedOne", { name: loan.name }));
      loadLoans();
    } catch (err: unknown) {
      setNotifyError((isAxiosError(err) && err.response?.data?.message) || t("loans.errorRemind"));
    } finally {
      setNotifyingId(null);
    }
  };

  const handleNotifyAllDue = async () => {
    if (!window.confirm(t("loans.confirmRemindAll"))) {
      return;
    }

    setNotifyResult("");
    setNotifyError("");
    setNotifyingAll(true);

    try {
      const res = await api.post("/loans/notify-due");
      const { sent, failed } = res.data as { sent: string[]; failed: string[] };
      setNotifyResult(
        failed.length
          ? t("loans.remindedSomeFailed", { sent: sent.length, failed: failed.length, list: failed.join(", ") })
          : t("loans.remindedAll", { sent: sent.length })
      );
      loadLoans();
    } catch (err: unknown) {
      setNotifyError((isAxiosError(err) && err.response?.data?.message) || t("loans.errorRemind"));
    } finally {
      setNotifyingAll(false);
    }
  };

  const openMessageModal = (loan: Loan) => {
    setMessageLoan(loan);
    setMessageText(
      t("loans.smsTemplate", {
        name: loan.name,
        number: loan.loan_number ?? "",
        balance: formatCurrency(Math.max(0, loan.balance)),
      })
    );
    setMessageError("");
    setMessageModalOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageLoan) return;

    setMessageError("");
    setSendingMessage(true);

    try {
      await api.post(`/loans/${messageLoan.id}/sms`, { message: messageText });
      setMessageModalOpen(false);
      setNotifyResult(t("loans.textSent", { name: messageLoan.name }));
      loadLoans();
    } catch (err: unknown) {
      setMessageError((isAxiosError(err) && err.response?.data?.message) || t("loans.errorText"));
    } finally {
      setSendingMessage(false);
    }
  };

  const usesAutoFee = form.auto_penalty && form.installments_enabled;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.loans")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("loans.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openCreateModal()}>
            <Plus className="size-4" />
            {t("loans.newLoan")}
          </Button>
          <Button variant="outline" onClick={handleNotifyAllDue} disabled={notifyingAll} title={t("loans.remindAllHint")}>
            {notifyingAll ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            {t("loans.remindAll")}
          </Button>
          <Button variant="outline" onClick={() => downloadLoansPdf(loans ?? [])} disabled={!loans || loans.length === 0}>
            <Download className="size-4" />
            {t("loans.exportPdf")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("loans.searchPlaceholder")}
            aria-label={t("loans.searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-56"
          aria-label={t("loans.filterLabel")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="open">{t("loans.filterOpen")}</option>
          <option value="">{t("loans.filterAll")}</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t("loans.filterOnly", { status: t(`status.${status}`) })}
            </option>
          ))}
        </Select>
        {!isNarrowed && expandable.length > 1 && (
          <Button variant="outline" onClick={toggleAll} className="sm:ml-auto">
            {allOpen ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            {allOpen ? t("loans.collapseAll") : t("loans.expandAll")}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notifyResult && (
        <Alert variant="success">
          <AlertDescription>{notifyResult}</AlertDescription>
        </Alert>
      )}
      {notifyError && (
        <Alert variant="destructive">
          <AlertDescription>{notifyError}</AlertDescription>
        </Alert>
      )}

      {!loans ? (
        <div className="flex justify-center rounded-xl border border-border py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-border py-8 text-center text-sm text-muted-foreground">
          {isNarrowed ? t("loans.emptyFiltered") : statusFilter === "open" ? t("loans.emptyOpen") : t("loans.emptyAll")}
        </div>
      ) : (
        <>
          {loans.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground">{t("loans.sumInterest")}</div>
                <div className="text-2xl font-bold tabular-nums">{formatCurrency(totalInterest)}</div>
                <div className="text-xs text-muted-foreground">{t("loans.sumScope", { count: loans.length })}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground">{t("loans.sumFees")}</div>
                <div className="text-2xl font-bold tabular-nums">{formatCurrency(totalPenalties)}</div>
                <div className="text-xs text-muted-foreground">{t("loans.sumScope", { count: loans.length })}</div>
              </div>
            </div>
          )}

          <AdminLoansList
            groups={groups}
            isOpen={isOpen}
            onToggle={toggleGroup}
            onNewLoan={openCreateModal}
            handlers={{
              notifyingId,
              deletingId,
              onNotify: handleNotify,
              onMessage: openMessageModal,
              onPayment: openPaymentModal,
              onHistory: openHistoryModal,
              onEdit: openEditModal,
              onDelete: handleDelete,
            }}
            person={{
              remindingId: remindingPersonId,
              onRemind: handlePersonRemind,
              onPayment: openPersonPayment,
            }}
          />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLoan ? t("loans.editTitle", { number: editingLoan.loan_number ?? "" }) : t("loans.newLoan")}
        description={editingLoan ? t("loans.editDesc") : t("loans.newDesc")}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <FormSection title={t("loans.sectionWho")}>
            {!editingLoan && (
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  variant={borrowerMode === "new" ? "default" : "ghost"}
                  onClick={() => setBorrowerMode("new")}
                >
                  {t("loans.modeNew")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  variant={borrowerMode === "existing" ? "default" : "ghost"}
                  onClick={() => setBorrowerMode("existing")}
                >
                  {t("loans.modeExisting")}
                </Button>
              </div>
            )}

            {!editingLoan && borrowerMode === "existing" ? (
              <div className="space-y-1.5">
                <Label htmlFor="borrower_id">{t("loans.colBorrower")}</Label>
                <Select
                  id="borrower_id"
                  required
                  value={selectedBorrowerId}
                  onChange={(e) => setSelectedBorrowerId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">{t("loans.pickBorrower")}</option>
                  {(borrowers ?? []).map((borrower) => (
                    <option key={borrower.id} value={borrower.id}>
                      {borrower.name} {borrower.username ? `(@${borrower.username})` : `(${t("common.noLogin")})`}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">{t("loans.existingHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">{t("profile.name")}</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("profile.phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="09XXXXXXXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">{t("profile.address")}</Label>
                  <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    {t("profile.email")} <span className="text-muted-foreground">{t("common.optional")}</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="credit_limit">
                    {t("loans.creditLimit")} <span className="text-muted-foreground">{t("common.optional")}</span>
                  </Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.credit_limit}
                    onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                    aria-describedby="credit_limit_hint"
                  />
                  <p id="credit_limit_hint" className="text-xs text-muted-foreground">{t("loans.creditLimitHint")}</p>
                </div>

                <div className="sm:col-span-2">
                  <Toggle
                    checked={needsLogin}
                    onChange={setNeedsLogin}
                    label={t("loans.usesPortal")}
                    hint={t("loans.usesPortalHint")}
                  />
                </div>

                {needsLogin && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="username">{t("login.username")}</Label>
                      <Input
                        id="username"
                        required
                        autoComplete="off"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">
                        {t("login.password")}{" "}
                        <span className="text-muted-foreground">{editingLoan ? t("loans.passwordKeep") : ""}</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </FormSection>

          <FormSection title={t("loans.sectionMoney")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="total_loan">{t("loans.amountLent")}</Label>
                <Input
                  id="total_loan"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  required
                  value={form.total_loan}
                  onChange={(e) => setForm({ ...form, total_loan: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="total_paid">{t("loans.alreadyPaid")}</Label>
                <Input
                  id="total_paid"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.total_paid}
                  onChange={(e) => setForm({ ...form, total_paid: e.target.value })}
                  aria-describedby="total_paid_hint"
                />
                <p id="total_paid_hint" className="text-xs text-muted-foreground">{t("loans.alreadyPaidHint")}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="start_date">{t("loans.startDate")}</Label>
                <Input
                  id="start_date"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm(withAutoDue({ ...form, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="due_date">{usesAutoFee ? t("loans.firstDue") : t("loan.dueDate")}</Label>
                <Input
                  id="due_date"
                  type="date"
                  required
                  value={form.due_date}
                  onChange={(e) => {
                    setDueManual(true);
                    setForm({ ...form, due_date: e.target.value });
                  }}
                />
                {!editingLoan && !dueManual && <p className="text-xs text-muted-foreground">{t("loans.dueAuto")}</p>}
                {usesAutoFee && <p className="text-xs text-muted-foreground">{t("loans.dueRolls")}</p>}
              </div>
            </div>
          </FormSection>

          <FormSection title={t("loans.sectionRules")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="interest_rate">{t("loans.rate")}</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                  aria-describedby="interest_rate_hint"
                />
                <p id="interest_rate_hint" className="text-xs text-muted-foreground">
                  {t("loans.rateHint", {
                    amount: formatCurrency((Number(form.total_loan) || 0) * ((Number(form.interest_rate) || 0) / 100)),
                  })}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="repayment_plan">{t("loans.plan")}</Label>
                <Select
                  id="repayment_plan"
                  value={form.repayment_plan}
                  disabled={!form.installments_enabled}
                  onChange={(e) => setForm(withAutoDue({ ...form, repayment_plan: e.target.value }))}
                >
                  {(plans ?? [])
                    .filter((plan) => plan.is_active || plan.key === form.repayment_plan)
                    .map((plan) => (
                      <option key={plan.key} value={plan.key}>
                        {plan.name}
                      </option>
                    ))}
                </Select>
                <p className="text-xs text-muted-foreground">{t("loans.planHint")}</p>
              </div>
            </div>

            <Toggle
              checked={form.installments_enabled}
              onChange={(v) => setForm({ ...form, installments_enabled: v })}
              label={t("loans.installments")}
              hint={t("loans.installmentsHint")}
            />
            <Toggle
              checked={usesAutoFee}
              disabled={!form.installments_enabled}
              onChange={(v) => setForm({ ...form, auto_penalty: v })}
              label={t("loans.autoFee")}
              hint={t("loans.autoFeeHint")}
            />
            <Toggle
              checked={form.compounds_interest}
              onChange={(v) => setForm({ ...form, compounds_interest: v })}
              label={t("loans.compound")}
              hint={t("loans.compoundHint")}
            />
          </FormSection>

          <FormSection title={t("loans.sectionOther")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="status">{t("loans.colStatus")}</Label>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as LoanStatus })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`status.${status}`)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">
                  {t("loans.notes")} <span className="text-muted-foreground">{t("common.optional")}</span>
                </Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </FormSection>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : editingLoan ? t("common.saveChanges") : t("loans.createLoan")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={t("loans.historyTitle", { number: historyLoan?.loan_number ?? "" })}
        description={
          historyLoan
            ? t("loans.historyDesc", { name: historyLoan.name, amount: formatCurrency(Math.max(0, historyLoan.balance)) })
            : undefined
        }
      >
        {historyError && (
          <Alert variant="destructive">
            <AlertDescription>{historyError}</AlertDescription>
          </Alert>
        )}
        {!historyEntries && !historyError ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <LoanHistoryTable entries={historyEntries ?? []} onRemovePenalty={handleRemovePenalty} />
        )}

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold">{t("loans.textsSent")}</h3>
          {smsLogError && (
            <Alert variant="destructive">
              <AlertDescription>{smsLogError}</AlertDescription>
            </Alert>
          )}
          {!smsLog && !smsLogError ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : smsLog && smsLog.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("loans.noTexts")}</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {smsLog?.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <Badge variant={entry.success ? "success" : "destructive"}>
                        {entry.success ? t("loans.textOk") : t("loans.textFailed")}
                      </Badge>
                    </div>
                    <p className="text-foreground/90">{entry.message}</p>
                    {!entry.success && entry.error && <p className="text-xs text-destructive">{entry.error}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={t("loans.paymentTitle", { name: paymentLoan?.name ?? "" })}
        description={
          paymentLoan
            ? t("loans.paymentDesc", {
                number: paymentLoan.loan_number ?? "",
                amount: formatCurrency(Math.max(0, paymentLoan.balance)),
              })
            : undefined
        }
      >
        <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
          {paymentError && (
            <Alert variant="destructive">
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="payment_amount">{t("loans.paymentAmount")}</Label>
            <Input
              id="payment_amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_note">
              {t("loans.paymentNote")} <span className="text-muted-foreground">{t("common.optional")}</span>
            </Label>
            <Textarea
              id="payment_note"
              placeholder={t("loans.paymentNotePlaceholder")}
              value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={savingPayment}>
              {savingPayment ? <Loader2 className="size-4 animate-spin" /> : t("loans.actionPayment")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={personPayGroup !== null}
        onClose={() => setPersonPayGroup(null)}
        title={t("loans.personPayTitle", { name: personPayGroup?.name ?? "" })}
        description={t("loans.personPayDesc")}
      >
        <form onSubmit={handlePersonPaySubmit} className="flex flex-col gap-4">
          {personPayError && (
            <Alert variant="destructive">
              <AlertDescription>{personPayError}</AlertDescription>
            </Alert>
          )}

          {!personPayLoans ? (
            !personPayError && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )
          ) : personPayLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("payAll.nothingOwed")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">{t("split.dueNowTotal")}</div>
                  <div className="text-lg font-semibold tabular-nums">{formatCurrency(totalDueNow(personPayLoans))}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">{t("split.owedTotal")}</div>
                  <div className="text-lg font-semibold tabular-nums">{formatCurrency(totalOwed(personPayLoans))}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="person_payment_amount">{t("loans.paymentAmount")}</Label>
                <Input
                  id="person_payment_amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max={totalOwed(personPayLoans)}
                  required
                  value={personPayForm.amount}
                  onChange={(e) => setPersonPayForm({ ...personPayForm, amount: e.target.value })}
                  aria-describedby="person_payment_max"
                />
                <p id="person_payment_max" className="text-xs text-muted-foreground">
                  {t("split.max", { amount: formatCurrency(totalOwed(personPayLoans)) })}
                </p>
                <div className="flex flex-wrap gap-x-4">
                  {totalDueNow(personPayLoans) > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 text-primary"
                      onClick={() => setPersonPayForm({ ...personPayForm, amount: String(totalDueNow(personPayLoans)) })}
                    >
                      {t("split.useDue", { amount: formatCurrency(totalDueNow(personPayLoans)) })}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 text-primary"
                    onClick={() => setPersonPayForm({ ...personPayForm, amount: String(totalOwed(personPayLoans)) })}
                  >
                    {t("split.useAll", { amount: formatCurrency(totalOwed(personPayLoans)) })}
                  </Button>
                </div>
              </div>

              <PaymentSplitPreview loans={personPayLoans} amount={Number(personPayForm.amount) || 0} />

              <div className="space-y-1.5">
                <Label htmlFor="person_payment_note">
                  {t("loans.paymentNote")} <span className="text-muted-foreground">{t("common.optional")}</span>
                </Label>
                <Textarea
                  id="person_payment_note"
                  placeholder={t("loans.paymentNotePlaceholder")}
                  value={personPayForm.note}
                  onChange={(e) => setPersonPayForm({ ...personPayForm, note: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPersonPayGroup(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                savingPersonPay ||
                !personPayLoans ||
                personPayLoans.length === 0 ||
                Math.round(Number(personPayForm.amount) * 100) > Math.round(totalOwed(personPayLoans) * 100)
              }
            >
              {savingPersonPay ? <Loader2 className="size-4 animate-spin" /> : t("loans.actionPayment")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        title={t("loans.textTitle", { name: messageLoan?.name ?? "" })}
        description={messageLoan?.phone ? t("loans.textDesc", { phone: messageLoan.phone }) : undefined}
      >
        <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
          {messageError && (
            <Alert variant="destructive">
              <AlertDescription>{messageError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="message_text">{t("loans.textLabel")}</Label>
            <Textarea
              id="message_text"
              required
              maxLength={640}
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground tabular-nums">{messageText.length}/640</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setMessageModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={sendingMessage}>
              {sendingMessage ? <Loader2 className="size-4 animate-spin" /> : t("loans.textSend")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
