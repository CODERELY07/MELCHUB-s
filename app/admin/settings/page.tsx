"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Bell, Landmark, Loader2, Receipt, Save, Wallet } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RepaymentPlansCard } from "@/components/repayment-plans-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LendingBudgetSettings, LoanDefaultsSettings, NotificationSettings, PaymentSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<PaymentSettings>({ gcash_name: "", gcash_number: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [notifyForm, setNotifyForm] = useState<NotificationSettings>({ admin_notify_phone: "" });
  const [notifyLoading, setNotifyLoading] = useState(true);
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifyError, setNotifyError] = useState("");
  const [notifySuccess, setNotifySuccess] = useState("");

  const [feeForm, setFeeForm] = useState<LoanDefaultsSettings>({ late_fee_amount: "" });
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeSuccess, setFeeSuccess] = useState("");

  const [budgetForm, setBudgetForm] = useState<LendingBudgetSettings>({ lending_budget: "", remaining_budget: null });
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [budgetSuccess, setBudgetSuccess] = useState("");

  useEffect(() => {
    api
      .get("/settings/lending-budget")
      .then((res) => setBudgetForm(res.data))
      .finally(() => setBudgetLoading(false));

    api
      .get("/settings/loan-defaults")
      .then((res) => setFeeForm(res.data))
      .finally(() => setFeeLoading(false));

    api
      .get("/settings/payment")
      .then((res) => setForm(res.data))
      .finally(() => setLoading(false));

    api
      .get("/settings/notifications")
      .then((res) => setNotifyForm(res.data))
      .finally(() => setNotifyLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await api.put("/settings/payment", form);
      setForm(res.data);
      setSuccess("Saved.");
    } catch (err: unknown) {
      setError((isAxiosError(err) && err.response?.data?.message) || "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifyError("");
    setNotifySuccess("");
    setNotifySaving(true);

    try {
      const res = await api.put("/settings/notifications", notifyForm);
      setNotifyForm(res.data);
      setNotifySuccess("Saved.");
    } catch (err: unknown) {
      setNotifyError((isAxiosError(err) && err.response?.data?.message) || "Couldn't save settings.");
    } finally {
      setNotifySaving(false);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError("");
    setBudgetSuccess("");
    setBudgetSaving(true);

    try {
      const res = await api.put("/settings/lending-budget", { lending_budget: budgetForm.lending_budget });
      setBudgetForm(res.data);
      setBudgetSuccess("Saved.");
    } catch (err: unknown) {
      setBudgetError((isAxiosError(err) && err.response?.data?.message) || "Couldn't save settings.");
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeError("");
    setFeeSuccess("");
    setFeeSaving(true);

    try {
      const res = await api.put("/settings/loan-defaults", feeForm);
      setFeeForm(res.data);
      setFeeSuccess("Saved.");
    } catch (err: unknown) {
      setFeeError((isAxiosError(err) && err.response?.data?.message) || "Couldn't save settings.");
    } finally {
      setFeeSaving(false);
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          The GCash details shown to borrowers on their dashboard and in SMS reminders.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/15 text-data-2">
              <Wallet className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">GCash payment account</CardTitle>
              <CardDescription>Shown to every borrower, everywhere payment is requested.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="gcash_name">Account name</Label>
                  <Input
                    id="gcash_name"
                    required
                    value={form.gcash_name}
                    onChange={(e) => setForm({ ...form, gcash_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gcash_number">GCash number</Label>
                  <Input
                    id="gcash_number"
                    required
                    value={form.gcash_number}
                    onChange={(e) => setForm({ ...form, gcash_number: e.target.value })}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving || loading}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleBudgetSubmit}>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-1/15 text-data-1">
              <Landmark className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">Lending budget</CardTitle>
              <CardDescription>
                The total you&apos;re willing to have lent out at once. Borrowers see what&apos;s left of it (or their own limit, if smaller) as what they can borrow.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetError && (
              <Alert variant="destructive">
                <AlertDescription>{budgetError}</AlertDescription>
              </Alert>
            )}
            {budgetSuccess && (
              <Alert variant="success">
                <AlertDescription>{budgetSuccess}</AlertDescription>
              </Alert>
            )}

            {budgetLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="lending_budget">
                  Budget (₱) <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="lending_budget"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 50000"
                  value={budgetForm.lending_budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, lending_budget: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {budgetForm.remaining_budget !== null
                    ? `${formatCurrency(budgetForm.remaining_budget)} left after loans currently out. `
                    : ""}
                  Counts the principal of every loan that isn&apos;t paid, cancelled, or defaulted. Leave blank for no shared cap.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={budgetSaving || budgetLoading}>
              {budgetSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleFeeSubmit}>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-data-4">
              <Receipt className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">Late fee</CardTitle>
              <CardDescription>
                Charged when a borrower misses their weekly or 3-day payment, and stated in their reminder text.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {feeError && (
              <Alert variant="destructive">
                <AlertDescription>{feeError}</AlertDescription>
              </Alert>
            )}
            {feeSuccess && (
              <Alert variant="success">
                <AlertDescription>{feeSuccess}</AlertDescription>
              </Alert>
            )}

            {feeLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="late_fee_amount">Late fee amount (₱)</Label>
                <Input
                  id="late_fee_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={feeForm.late_fee_amount}
                  onChange={(e) => setFeeForm({ late_fee_amount: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  One fee for every loan, whichever repayment plan it&apos;s on. Applies to reminders sent from now on.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={feeSaving || feeLoading}>
              {feeSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleNotifySubmit}>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-5/15 text-data-5">
              <Bell className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">Admin notifications</CardTitle>
              <CardDescription>
                Get a text the moment a borrower submits a new payment proof to review.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifyError && (
              <Alert variant="destructive">
                <AlertDescription>{notifyError}</AlertDescription>
              </Alert>
            )}
            {notifySuccess && (
              <Alert variant="success">
                <AlertDescription>{notifySuccess}</AlertDescription>
              </Alert>
            )}

            {notifyLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="admin_notify_phone">
                  Notification phone <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="admin_notify_phone"
                  placeholder="e.g. 09171234567"
                  value={notifyForm.admin_notify_phone}
                  onChange={(e) => setNotifyForm({ admin_notify_phone: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to turn this alert off.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={notifySaving || notifyLoading}>
              {notifySaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>
      <RepaymentPlansCard />
    </div>
  );
}
