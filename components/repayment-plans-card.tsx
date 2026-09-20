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
import type { RepaymentPlanRecord } from "@/lib/types";

const EMPTY = { name: "", period_days: "7", installments: "5", daily_rate: "0.4" };

/** Admin: create, deactivate and delete the repayment plans borrowers/loans can use. */
export function RepaymentPlansCard() {
  const [plans, setPlans] = useState<RepaymentPlanRecord[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get("/repayment-plans")
      .then((res) => setPlans(res.data))
      .catch(() => setError("Couldn't load repayment plans."));
  }, []);

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
      fail(err, "Couldn't create the plan.");
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
      fail(err, "Couldn't update the plan.");
    }
  };

  const remove = async (plan: RepaymentPlanRecord) => {
    if (!window.confirm(`Delete "${plan.name}"?`)) return;
    setError("");
    try {
      await api.delete(`/repayment-plans/${plan.id}`);
      load();
    } catch (err) {
      fail(err, "Couldn't delete the plan.");
    }
  };

  return (
    <Card>
      <CardHeader className="!flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-data-4">
          <CalendarRange className="size-4.5" />
        </span>
        <div>
          <CardTitle as="h2" className="text-base">Repayment plans</CardTitle>
          <CardDescription>
            Plans borrowers can request and you can assign to a loan. Each installment = an even share of the
            principal plus that period&apos;s interest.
          </CardDescription>
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
                    {plan.name} {!plan.is_active && <Badge variant="muted">inactive</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Every {plan.period_days} day{plan.period_days > 1 ? "s" : ""} · {plan.installments} installments ·{" "}
                    {Number(plan.daily_rate)}%/day interest
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => toggle(plan)}>
                    {plan.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => remove(plan)} aria-label={`Delete ${plan.name}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={add} className="grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="plan_name">New plan name</Label>
            <Input id="plan_name" required placeholder="e.g. 2-Week Plan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan_days">Days per installment</Label>
            <Input id="plan_days" type="number" min="1" required value={form.period_days} onChange={(e) => setForm({ ...form, period_days: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan_count">Number of installments</Label>
            <Input id="plan_count" type="number" min="1" required value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="plan_rate">Interest per day (%)</Label>
            <Input id="plan_rate" type="number" step="0.001" min="0" required value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add plan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
