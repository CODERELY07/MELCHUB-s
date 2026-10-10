"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import type { RepaymentPlanRecord } from "@/lib/types";

const EMPTY = { name: "", period_days: "7", installments: "5", daily_rate: "0.4" };

/** Admin: create, deactivate and delete the repayment plans borrowers/loans can use. */
export function RepaymentPlansCard() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<RepaymentPlanRecord[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get("/repayment-plans")
      .then((res) => setPlans(res.data))
      .catch(() => setError(t("plans.loadError")));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (err: unknown, fallback: string) =>
    setError(
      (isAxiosError(err) &&
        (err.response?.data?.message || Object.values(err.response?.data?.errors ?? {}).flat()[0])) ||
        fallback
    );

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/repayment-plans", {
        name: form.name,
        period_days: Number(form.period_days),
        installments: Number(form.installments),
        daily_rate: Number(form.daily_rate),
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      fail(err, t("plans.createError"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (plan: RepaymentPlanRecord) => {
    setError("");
    try {
      await api.put(`/repayment-plans/${plan.id}`, { ...plan, is_active: !plan.is_active });
      load();
    } catch (err) {
      fail(err, t("plans.updateError"));
    }
  };

  const remove = async (plan: RepaymentPlanRecord) => {
    if (!window.confirm(t("plans.confirmDelete", { name: plan.name }))) return;
    setError("");
    try {
      await api.delete(`/repayment-plans/${plan.id}`);
      load();
    } catch (err) {
      fail(err, t("plans.deleteError"));
    }
  };

  return (
    <Card>
      <CardHeader className="!flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-data-4">
          <CalendarRange className="size-4.5" />
        </span>
        <div>
          <CardTitle as="h3" className="text-base">{t("plans.title")}</CardTitle>
          <CardDescription>{t("plans.desc")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!plans ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col gap-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {plan.name} {!plan.is_active && <Badge variant="muted">{t("plans.hidden")}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("plans.summary", {
                      count: plan.installments,
                      days: plan.period_days,
                      rate: Number(plan.daily_rate),
                      share: Math.round(100 / Math.max(1, plan.installments)),
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => toggle(plan)}>
                    {plan.is_active ? t("plans.hide") : t("plans.show")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => remove(plan)}
                    aria-label={t("plans.deleteLabel", { name: plan.name })}
                    title={t("plans.deleteLabel", { name: plan.name })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={add} className="grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="plan_name">{t("plans.newName")}</Label>
            <Input id="plan_name" required placeholder={t("plans.newNamePlaceholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan_days">{t("plans.days")}</Label>
            <Input id="plan_days" type="number" min="1" required value={form.period_days} onChange={(e) => setForm({ ...form, period_days: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan_count">{t("plans.count")}</Label>
            <Input id="plan_count" type="number" min="1" required value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="plan_rate">{t("plans.rate")}</Label>
            <Input id="plan_rate" type="number" step="0.001" min="0" required value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t("plans.add")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
