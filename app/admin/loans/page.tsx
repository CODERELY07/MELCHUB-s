"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BellRing, ChevronsDownUp, ChevronsUpDown, Download, Loader2, Plus, Search } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import { LOGIN_PATH } from "@/lib/auth-context";
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
import { formatCurrency, toDateInputValue, todayInManila } from "@/lib/format";
import { downloadLoansPdf } from "@/lib/loans-pdf";
import { useRepaymentPlans } from "@/lib/use-repayment-plans";
import type {
  Borrower,
  Loan,
  LoanFormValues,
  LoanHistoryEntry,
  LoanStatus,
  RepaymentPlanRecord,
  SmsLogEntry,
} from "@/lib/types";

const STATUS_OPTIONS: LoanStatus[] = [
  "pending",
  "active",
  "paid",
  "overdue",
  "defaulted",
  "cancelled",
];

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

export default function AdminLoansPage() {
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
  const totalInterest = (loans ?? []).reduce((sum, l) => sum + Number(l.interest_amount), 0);
  const totalPenalties = (loans ?? []).reduce((sum, l) => sum + Number(l.penalty_amount), 0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoanStatus | "">("");
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

  // One entry per person, newest-loan first. People with no loans yet are
  // included too (so a freshly added client doesn't seem to vanish), but only
  // while nothing is filtered — a search/status filter is about loans.
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

    if (!search && !statusFilter) {
      for (const borrower of borrowers ?? []) {
        if (!map.has(borrower.id)) {
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
  }, [loans, borrowers, search, statusFilter]);

  // While searching/filtering, everything is expanded — the point of a
  // search is to see the matching loans, not to click through to them.
  const forceOpen = Boolean(search || statusFilter);
  const isOpen = (borrowerId: number) => forceOpen || openIds.has(borrowerId);
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
        setError("Couldn't load loans.");
      });
  }, [router, search, statusFilter]);

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
        setFormError("Please choose which borrower this loan is for.");
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
      const messages = responseData?.errors as
        | Record<string, string[]>
        | undefined;
      setFormError(
        messages
          ? Object.values(messages).flat().join(" ")
          : responseData?.message || "Couldn't save this loan."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loan: Loan) => {
    if (!window.confirm(`Delete loan ${loan.loan_number} for ${loan.name}? This can't be undone.`)) {
      return;
    }

    setDeletingId(loan.id);
    try {
      await api.delete(`/loans/${loan.id}`);
      loadLoans();
    } catch {
      setError("Couldn't delete this loan.");
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
      .catch(() => setHistoryError("Couldn't load this loan's history."));

    api
      .get(`/loans/${loan.id}/sms-log`)
      .then((res) => setSmsLog(res.data))
      .catch(() => setSmsLogError("Couldn't load this loan's message log."));
  };

  const handleRemovePenalty = async (entry: LoanHistoryEntry) => {
    if (!historyLoan || !entry.id) return;
    if (!window.confirm(`Remove this ${formatCurrency(entry.amount)} late fee from ${historyLoan.loan_number}?`)) {
      return;
    }

    setHistoryError("");
    try {
      await api.delete(`/loans/${historyLoan.id}/penalties/${entry.id}`);
      const res = await api.get(`/loans/${historyLoan.id}/history`);
      setHistoryEntries(res.data);
      loadLoans();
    } catch {
      setHistoryError("Couldn't remove that late fee.");
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
      setPaymentError(
        messages
          ? Object.values(messages).flat().join(" ")
          : responseData?.message || "Couldn't record this payment."
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const handleNotify = async (loan: Loan) => {
    setNotifyResult("");
    setNotifyError("");
    setNotifyingId(loan.id);

    try {
      await api.post(`/loans/${loan.id}/notify`);
      setNotifyResult(`Notified ${loan.name}.`);
      loadLoans();
    } catch (err: unknown) {
      setNotifyError((isAxiosError(err) && err.response?.data?.message) || "Couldn't send that notification.");
    } finally {
      setNotifyingId(null);
    }
  };

  const handleNotifyAllDue = async () => {
    if (!window.confirm("Send a reminder SMS to every borrower whose loan is due today or overdue?")) {
      return;
    }

    setNotifyResult("");
    setNotifyError("");
    setNotifyingAll(true);

    try {
      const res = await api.post("/loans/notify-due");
      const { sent, failed } = res.data as { sent: string[]; failed: string[] };
      setNotifyResult(
        `Notified ${sent.length} borrower${sent.length === 1 ? "" : "s"}` +
          (failed.length ? `, ${failed.length} failed (${failed.join(", ")}).` : ".")
      );
      loadLoans();
    } catch (err: unknown) {
      setNotifyError((isAxiosError(err) && err.response?.data?.message) || "Couldn't send notifications.");
    } finally {
      setNotifyingAll(false);
    }
  };

  const openMessageModal = (loan: Loan) => {
    setMessageLoan(loan);
    setMessageText(
      `Hi ${loan.name}, this is MELCHUB regarding your loan ${loan.loan_number} (balance: ${formatCurrency(loan.balance)}). `
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
      setNotifyResult(`Message sent to ${messageLoan.name}.`);
      loadLoans();
    } catch (err: unknown) {
      setMessageError((isAxiosError(err) && err.response?.data?.message) || "Couldn't send that message.");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-sm text-muted-foreground">
            Manage borrowers and their loan records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => downloadLoansPdf(loans ?? [])}
            disabled={!loans || loans.length === 0}
          >
            <Download className="size-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleNotifyAllDue} disabled={notifyingAll}>
            {notifyingAll ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Notify all due
          </Button>
          <Button onClick={() => openCreateModal()}>
            <Plus className="size-4" />
            New loan
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or loan #"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LoanStatus | "")}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        {!forceOpen && expandable.length > 1 && (
          <Button variant="outline" onClick={toggleAll} className="sm:ml-auto">
            {allOpen ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            {allOpen ? "Collapse all" : "Expand all"}
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
          {search || statusFilter ? "No loans match your search/filter." : "No loans yet. Create the first one."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Total interest (profit)</div>
              <div className="text-2xl font-bold">{formatCurrency(totalInterest)}</div>
              <div className="text-xs text-muted-foreground">Across the {loans.length} loan{loans.length === 1 ? "" : "s"} shown</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Late fees charged</div>
              <div className="text-2xl font-bold">{formatCurrency(totalPenalties)}</div>
              <div className="text-xs text-muted-foreground">Extra profit on top of interest</div>
            </div>
          </div>

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
          />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLoan ? `Edit loan ${editingLoan.loan_number ?? ""}` : "New loan"}
        description="Borrower details and loan terms."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {!editingLoan && (
            <div className="flex gap-1 rounded-lg border border-border p-1">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                variant={borrowerMode === "new" ? "default" : "ghost"}
                onClick={() => setBorrowerMode("new")}
              >
                New borrower
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                variant={borrowerMode === "existing" ? "default" : "ghost"}
                onClick={() => setBorrowerMode("existing")}
              >
                Existing borrower
              </Button>
            </div>
          )}

          {!editingLoan && borrowerMode === "existing" ? (
            <div className="space-y-1.5">
              <Label htmlFor="borrower_id">Borrower</Label>
              <Select
                id="borrower_id"
                required
                value={selectedBorrowerId}
                onChange={(e) => setSelectedBorrowerId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select a borrower&hellip;</option>
                {(borrowers ?? []).map((borrower) => (
                  <option key={borrower.id} value={borrower.id}>
                    {borrower.name} {borrower.username ? `(@${borrower.username})` : "(no login)"}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Gives this borrower a new loan without touching their earlier ones.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-input"
                    checked={needsLogin}
                    onChange={(e) => setNeedsLogin(e.target.checked)}
                  />
                  <span>
                    This person will use the borrower portal
                    <span className="block text-xs text-muted-foreground">
                      Turn off for someone who&apos;ll never log in — just track their loan under their name,
                      with no username or password to set up.
                    </span>
                  </span>
                </label>
              </div>

              {needsLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    required
                    placeholder="Used to log in to the borrower portal"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="borrower@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {needsLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    Password <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={editingLoan ? "Leave blank to keep current" : ""}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="credit_limit">
                  Credit limit <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="credit_limit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="How much this client may borrow in total"
                  value={form.credit_limit}
                  onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="total_loan">Principal amount</Label>
              <Input
                id="total_loan"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.total_loan}
                onChange={(e) => setForm({ ...form, total_loan: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="total_paid">Total paid</Label>
              <Input
                id="total_paid"
                type="number"
                step="0.01"
                min="0"
                value={form.total_paid}
                onChange={(e) => setForm({ ...form, total_paid: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="interest_rate">Interest rate (% per day)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.interest_rate}
                onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
              />
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input"
                  checked={form.compounds_interest}
                  onChange={(e) => setForm({ ...form, compounds_interest: e.target.checked })}
                />
                <span>
                  Compound interest daily
                  <span className="block text-xs text-muted-foreground">
                    Each day&apos;s interest is added to the balance, so the next day&apos;s interest is
                    calculated on that larger amount — not just the original principal. Recorded as a real
                    entry every day, not just calculated on the spot.
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="repayment_plan">Repayment plan</Label>
              <Select
                id="repayment_plan"
                value={form.repayment_plan}
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
              <p className="text-xs text-muted-foreground">
                Sets the wording of due-date reminders and how far a missed payment pushes the due date. Create more plans in Settings.
              </p>
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input"
                  checked={form.installments_enabled}
                  onChange={(e) => setForm({ ...form, installments_enabled: e.target.checked })}
                />
                <span>
                  Pays in installments
                  <span className="block text-xs text-muted-foreground">
                    Turn off for this borrower to skip late fees and due-date push-outs.
                  </span>
                </span>
              </label>
              <label
                className={`mt-2 flex items-start gap-2 text-sm ${form.installments_enabled ? "" : "opacity-50"}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input"
                  checked={form.auto_penalty && form.installments_enabled}
                  disabled={!form.installments_enabled}
                  onChange={(e) => setForm({ ...form, auto_penalty: e.target.checked })}
                />
                <span>
                  Charge the late fee automatically
                  <span className="block text-xs text-muted-foreground">
                    Every week, if the total paid is below what should be paid by then, the late fee from Settings is
                    added by itself and the next week&apos;s deadline begins. Never charges for weeks before this was
                    turned on.
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as LoanStatus })
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm(withAutoDue({ ...form, start_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">{form.auto_penalty && form.installments_enabled ? "First payment due" : "Due date"}</Label>
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
              {!editingLoan && !dueManual && (
                <p className="text-xs text-muted-foreground">Set from the start date and plan — change it if needed.</p>
              )}
              {form.auto_penalty && form.installments_enabled && (
                <p className="text-xs text-muted-foreground">
                  The next payment date moves forward by itself every period after this.
                </p>
              )}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editingLoan ? (
                "Save changes"
              ) : (
                "Create loan"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`History for ${historyLoan?.loan_number ?? ""}`}
        description={historyLoan ? `${historyLoan.name} · ${formatCurrency(historyLoan.balance)} remaining` : undefined}
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
          <h3 className="mb-2 text-sm font-semibold">Messages sent</h3>
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
            <p className="py-4 text-center text-sm text-muted-foreground">
              No messages sent to this loan yet.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {smsLog?.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <Badge variant={entry.success ? "success" : "destructive"}>
                        {entry.success ? "sent" : "failed"}
                      </Badge>
                    </div>
                    <p className="text-foreground/90">{entry.message}</p>
                    {!entry.success && entry.error && (
                      <p className="text-xs text-destructive">{entry.error}</p>
                    )}
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
        title={`Record payment for ${paymentLoan?.name ?? ""}`}
        description={paymentLoan ? `Current balance: ${formatCurrency(paymentLoan.balance)}` : undefined}
      >
        <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
          {paymentError && (
            <Alert variant="destructive">
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="payment_amount">Amount received</Label>
            <Input
              id="payment_amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_note">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="payment_note"
              placeholder="e.g. Paid via GCash"
              value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingPayment}>
              {savingPayment ? <Loader2 className="size-4 animate-spin" /> : "Record payment"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        title={`Message ${messageLoan?.name ?? ""}`}
        description={messageLoan?.phone ? `Sent by SMS to ${messageLoan.phone}` : undefined}
      >
        <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
          {messageError && (
            <Alert variant="destructive">
              <AlertDescription>{messageError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="message_text">Message</Label>
            <Textarea
              id="message_text"
              required
              maxLength={640}
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{messageText.length}/640</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setMessageModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendingMessage}>
              {sendingMessage ? <Loader2 className="size-4 animate-spin" /> : "Send SMS"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
