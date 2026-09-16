"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import type { Loan, LoanFormValues, LoanStatus } from "@/lib/types";

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
  email: "",
  password: "",
  phone: "",
  location: "",
  total_loan: "",
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState<LoanFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();

  const loadLoans = useCallback(() => {
    api
      .get("/loans")
      .then((res) => {
        setLoans(res.data);
        setError("");
      })
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError("Couldn't load loans.");
      });
  }, [router]);

  useEffect(() => {
    loadLoans();
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
      email: loan.email ?? "",
      password: "",
      phone: loan.phone ?? "",
      location: loan.location ?? "",
      total_loan: loan.total_loan,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Loans</h1>
          <p className="text-sm text-muted-foreground">
            Manage borrowers and their loan records.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          New loan
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
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
            {!loans && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            )}

            {loans && loans.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  No loans yet. Create the first one.
                </td>
              </tr>
            )}

            {loans?.map((loan) => (
              <tr key={loan.id}>
                <td className="px-3 py-2 font-mono text-xs">{loan.loan_number}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{loan.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {loan.email} {loan.phone ? `· ${loan.phone}` : ""}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="interest_rate">Interest rate (%)</Label>
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

            <div className="col-span-2 space-y-1.5">
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
    </div>
  );
}
