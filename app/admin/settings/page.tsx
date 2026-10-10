"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Bell, Landmark, Loader2, Receipt, Save, Wallet } from "lucide-react";

import api from "@/lib/axios";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CashAccountsCard } from "@/components/cash-accounts-card";
import { RepaymentPlansCard } from "@/components/repayment-plans-card";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LendingBudgetSettings, LoanDefaultsSettings, NotificationSettings, PaymentSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

/** Saved / failed message for one settings card. */
function SaveStatus({ error, saved }: { error: string; saved: boolean }) {
  const { t } = useI18n();
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (saved) {
    return (
      <Alert variant="success">
        <AlertDescription>{t("settings.saved")}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

function SaveButton({ saving, disabled }: { saving: boolean; disabled: boolean }) {
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={saving || disabled}>
      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {t("common.saveChanges")}
    </Button>
  );
}

/**
 * Settings grouped by the question the owner is asking ("how do I get
 * paid?", "how much do I lend?", "where's my money?", "how do I hear about
 * things?") instead of one long undifferentiated stack of cards.
 */
export default function AdminSettingsPage() {
  const { t } = useI18n();
  const [form, setForm] = useState<PaymentSettings>({ gcash_name: "", gcash_number: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [notifyForm, setNotifyForm] = useState<NotificationSettings>({ admin_notify_phone: "" });
  const [notifyLoading, setNotifyLoading] = useState(true);
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifyError, setNotifyError] = useState("");
  const [notifySaved, setNotifySaved] = useState(false);

  const [feeForm, setFeeForm] = useState<LoanDefaultsSettings>({ late_fee_amount: "" });
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeSaved, setFeeSaved] = useState(false);

  const [budgetForm, setBudgetForm] = useState<LendingBudgetSettings>({ lending_budget: "", remaining_budget: null });
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [budgetSaved, setBudgetSaved] = useState(false);

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

  /** Shared save flow for the four simple cards. */
  const save = async <T,>(
    e: React.FormEvent,
    url: string,
    body: unknown,
    apply: (data: T) => void,
    setBusy: (v: boolean) => void,
    setErr: (v: string) => void,
    setOk: (v: boolean) => void
  ) => {
    e.preventDefault();
    setErr("");
    setOk(false);
    setBusy(true);
    try {
      const res = await api.put(url, body);
      apply(res.data as T);
      setOk(true);
    } catch (err: unknown) {
      setErr((isAxiosError(err) && err.response?.data?.message) || t("settings.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.settings")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("settings.groupPaid")}</h2>

        <Card>
          <form
            onSubmit={(e) => save<PaymentSettings>(e, "/settings/payment", form, setForm, setSaving, setError, setSaved)}
          >
            <CardHeader className="!flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/15 text-data-2">
                <Wallet className="size-4.5" />
              </span>
              <div>
                <CardTitle as="h3" className="text-base">{t("settings.gcashTitle")}</CardTitle>
                <CardDescription>{t("settings.gcashDesc")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SaveStatus error={error} saved={saved} />
              {loading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="gcash_name">{t("settings.gcashName")}</Label>
                    <Input
                      id="gcash_name"
                      required
                      value={form.gcash_name}
                      onChange={(e) => setForm({ ...form, gcash_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gcash_number">{t("settings.gcashNumber")}</Label>
                    <Input
                      id="gcash_number"
                      required
                      inputMode="tel"
                      value={form.gcash_number}
                      onChange={(e) => setForm({ ...form, gcash_number: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <SaveButton saving={saving} disabled={loading} />
            </CardFooter>
          </form>
        </Card>

        <Card>
          <form
            onSubmit={(e) =>
              save<LoanDefaultsSettings>(e, "/settings/loan-defaults", feeForm, setFeeForm, setFeeSaving, setFeeError, setFeeSaved)
            }
          >
            <CardHeader className="!flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-data-4">
                <Receipt className="size-4.5" />
              </span>
              <div>
                <CardTitle as="h3" className="text-base">{t("settings.feeTitle")}</CardTitle>
                <CardDescription>{t("settings.feeDesc")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SaveStatus error={feeError} saved={feeSaved} />
              {feeLoading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="space-y-1.5 sm:max-w-xs">
                  <Label htmlFor="late_fee_amount">{t("settings.feeAmount")}</Label>
                  <Input
                    id="late_fee_amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    value={feeForm.late_fee_amount}
                    onChange={(e) => setFeeForm({ late_fee_amount: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.feeHint")}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <SaveButton saving={feeSaving} disabled={feeLoading} />
            </CardFooter>
          </form>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("settings.groupLending")}</h2>

        <Card>
          <form
            onSubmit={(e) =>
              save<LendingBudgetSettings>(
                e,
                "/settings/lending-budget",
                { lending_budget: budgetForm.lending_budget },
                setBudgetForm,
                setBudgetSaving,
                setBudgetError,
                setBudgetSaved
              )
            }
          >
            <CardHeader className="!flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-1/15 text-data-1">
                <Landmark className="size-4.5" />
              </span>
              <div>
                <CardTitle as="h3" className="text-base">{t("settings.budgetTitle")}</CardTitle>
                <CardDescription>{t("settings.budgetDesc")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SaveStatus error={budgetError} saved={budgetSaved} />
              {budgetLoading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="space-y-1.5 sm:max-w-xs">
                  <Label htmlFor="lending_budget">
                    {t("settings.budgetAmount")} <span className="text-muted-foreground">{t("common.optional")}</span>
                  </Label>
                  <Input
                    id="lending_budget"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={budgetForm.lending_budget}
                    onChange={(e) => setBudgetForm({ ...budgetForm, lending_budget: e.target.value })}
                  />
                  {budgetForm.remaining_budget !== null && (
                    <p className="text-sm font-medium">
                      {t("settings.budgetLeft", { amount: formatCurrency(budgetForm.remaining_budget) })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{t("settings.budgetHint")}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <SaveButton saving={budgetSaving} disabled={budgetLoading} />
            </CardFooter>
          </form>
        </Card>

        <RepaymentPlansCard />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("settings.groupMoney")}</h2>
        <CashAccountsCard />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("settings.groupAlerts")}</h2>

        <Card>
          <form
            onSubmit={(e) =>
              save<NotificationSettings>(
                e,
                "/settings/notifications",
                notifyForm,
                setNotifyForm,
                setNotifySaving,
                setNotifyError,
                setNotifySaved
              )
            }
          >
            <CardHeader className="!flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-5/15 text-data-5">
                <Bell className="size-4.5" />
              </span>
              <div>
                <CardTitle as="h3" className="text-base">{t("settings.alertTitle")}</CardTitle>
                <CardDescription>{t("settings.alertDesc")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SaveStatus error={notifyError} saved={notifySaved} />
              {notifyLoading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="space-y-1.5 sm:max-w-xs">
                  <Label htmlFor="admin_notify_phone">
                    {t("settings.alertPhone")} <span className="text-muted-foreground">{t("common.optional")}</span>
                  </Label>
                  <Input
                    id="admin_notify_phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="09XXXXXXXXX"
                    value={notifyForm.admin_notify_phone}
                    onChange={(e) => setNotifyForm({ admin_notify_phone: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.alertHint")}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <SaveButton saving={notifySaving} disabled={notifyLoading} />
            </CardFooter>
          </form>
        </Card>
      </section>
    </div>
  );
}
