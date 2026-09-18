"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  Bell,
  BellRing,
  Download,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import { LOGIN_PATH } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoanHistoryTable } from "@/components/loan-history-table";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { downloadLoansCsv } from "@/lib/loans-csv";
import type { Loan, LoanFormValues, LoanHistoryEntry, LoanStatus, SmsLogEntry } from "@/lib/types";

const STATUS_OPTIONS: LoanStatus[] = [
  "pending",
  "active",
  "paid",
  "overdue",
  "defaulted",
  "cancelled",
];

const STATUS_BADGE: Record<LoanStatus, "default" | "success" | "warning" | "destructive" | "muted"> = {
  pending: "muted",
  active: "default",
  paid: "success",
  overdue: "warning",
  defaulted: "destructive",
  cancelled: "muted",
};

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
  status: "pending",
  notes: "",
  start_date: "",
  due_date: "",
};

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<Loan[] | null>(null);
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

  const openCreateModal = () => {
    setEditingLoan(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setForm({
      name: loan.name,
      username: loan.username,
      email: loan.email ?? "",
      password: "",
      phone: loan.phone ?? "",
      location: loan.location ?? "",
      total_loan: loan.total_loan,
      credit_limit: loan.credit_limit ?? "",
      total_paid: loan.total_paid,
      interest_rate: loan.interest_rate,
      status: loan.status,
      notes: loan.notes ?? "",
      start_date: toDateInputValue(loan.start_date),
      due_date: toDateInputValue(loan.due_date),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    if (!payload.password) delete payload.password;

    try {
      if (editingLoan) {
        await api.put(`/loans/${editingLoan.id}`, payload);
      } else {
        await api.post("/loans", payload);
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
    if (!window.confirm(`Delete the loan for ${loan.name}? This can't be undone.`)) {
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
            onClick={() => downloadLoansCsv(loans ?? [])}
            disabled={!loans || loans.length === 0}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleNotifyAllDue} disabled={notifyingAll}>
            {notifyingAll ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Notify all due
          </Button>
          <Button onClick={openCreateModal}>
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
      ) : loans.length === 0 ? (
        <div className="rounded-xl border border-border py-8 text-center text-sm text-muted-foreground">
          {search || statusFilter ? "No loans match your search/filter." : "No loans yet. Create the first one."}
        </div>
      ) : (
        <>
          {/* Table — md and up, where there's room for every column at once */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Loan #</th>
                  <th className="px-3 py-2 font-medium">Borrower</th>
                  <th className="px-3 py-2 font-medium">Principal</th>
                  <th className="px-3 py-2 font-medium">Paid</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="px-3 py-2 font-mono text-xs">{loan.loan_number}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={loan.name} />
                        <div>
                          <div className="font-medium">{loan.name}</div>
                          <div className="text-xs text-muted-foreground">
                            @{loan.username} {loan.phone ? `· ${loan.phone}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{formatCurrency(loan.total_loan)}</td>
                    <td className="px-3 py-2">{formatCurrency(loan.total_paid)}</td>
                    <td className="px-3 py-2">{formatCurrency(loan.balance)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_BADGE[loan.status]}>
                        {loan.is_overdue ? "overdue" : loan.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{formatDate(loan.due_date)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleNotify(loan)}
                          disabled={notifyingId === loan.id || !loan.phone}
                          aria-label={`Notify ${loan.name}`}
                          title={loan.phone ? undefined : "No phone number on file"}
                        >
                          {notifyingId === loan.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Bell className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openMessageModal(loan)}
                          disabled={!loan.phone}
                          aria-label={`Message ${loan.name}`}
                          title={loan.phone ? undefined : "No phone number on file"}
                        >
                          <MessageSquare className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openPaymentModal(loan)}
                          aria-label={`Record payment for ${loan.name}`}
                        >
                          <Banknote className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openHistoryModal(loan)}
                          aria-label={`View history for ${loan.name}`}
                        >
                          <History className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(loan)}
                          aria-label={`Edit loan for ${loan.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(loan)}
                          disabled={deletingId === loan.id}
                          aria-label={`Delete loan for ${loan.name}`}
                        >
                          {deletingId === loan.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — below md, where a 900px-wide table would only mean sideways scrolling */}
          <div className="flex flex-col gap-3 md:hidden">
            {loans.map((loan) => (
              <Card key={loan.id}>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={loan.name} />
                      <div>
                        <div className="font-medium">{loan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {loan.loan_number} · @{loan.username}
                          {loan.phone ? ` · ${loan.phone}` : ""}
                        </div>
                      </div>
                    </div>
                    <Badge variant={STATUS_BADGE[loan.status]}>
                      {loan.is_overdue ? "overdue" : loan.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Principal</div>
                      <div className="font-medium">{formatCurrency(loan.total_loan)}</div>
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
                    Due {formatDate(loan.due_date)}
                  </div>

                  <div className="flex flex-wrap gap-1 border-t border-border pt-3">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => handleNotify(loan)}
                      disabled={notifyingId === loan.id || !loan.phone}
                      aria-label={`Notify ${loan.name}`}
                      title={loan.phone ? undefined : "No phone number on file"}
                    >
                      {notifyingId === loan.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Bell className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => openMessageModal(loan)}
                      disabled={!loan.phone}
                      aria-label={`Message ${loan.name}`}
                      title={loan.phone ? undefined : "No phone number on file"}
                    >
                      <MessageSquare className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => openPaymentModal(loan)}
                      aria-label={`Record payment for ${loan.name}`}
                    >
                      <Banknote className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => openHistoryModal(loan)}
                      aria-label={`View history for ${loan.name}`}
                    >
                      <History className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => openEditModal(loan)}
                      aria-label={`Edit loan for ${loan.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => handleDelete(loan)}
                      disabled={deletingId === loan.id}
                      aria-label={`Delete loan for ${loan.name}`}
                    >
                      {deletingId === loan.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due date</Label>
              <Input
                id="due_date"
                type="date"
                required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
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
          <LoanHistoryTable entries={historyEntries ?? []} />
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
