"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Landmark, Loader2, Plus, Trash2 } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CashAccount } from "@/lib/types";

const EMPTY = { name: "", amount: "" };

/**
 * Admin: freely-named "money on hand" accounts (GCash, a bank, cash in a
 * drawer, …) — feeds the Dashboard's "Money on hand" / "Money with
 * interest" totals (this card's sum + loaned-out principal, or + the
 * outstanding balance). Same add/edit/delete list pattern as
 * RepaymentPlansCard.
 */
export function CashAccountsCard() {
  const [accounts, setAccounts] = useState<CashAccount[] | null>(null);
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get("/cash-accounts")
      .then((res) => setAccounts(res.data))
      .catch(() => setError("Couldn't load cash accounts."));
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

  const total = (accounts ?? []).reduce((sum, a) => sum + Number(a.amount), 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/cash-accounts", { name: form.name, amount: Number(form.amount) });
      setForm(EMPTY);
      load();
    } catch (err) {
      fail(err, "Couldn't add that account.");
    } finally {
      setSaving(false);
    }
  };

  const saveAmount = async (account: CashAccount) => {
    const value = editing[account.id];
    if (value === undefined || value === account.amount) return;
    setError("");
    try {
      await api.put(`/cash-accounts/${account.id}`, { name: account.name, amount: Number(value) });
      load();
    } catch (err) {
      fail(err, "Couldn't update that account.");
    }
  };

  const remove = async (account: CashAccount) => {
    if (!window.confirm(`Delete "${account.name}"?`)) return;
    setError("");
    try {
      await api.delete(`/cash-accounts/${account.id}`);
      load();
    } catch (err) {
      fail(err, "Couldn't delete that account.");
    }
  };

  return (
    <Card>
      <CardHeader className="!flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/15 text-data-2">
          <Landmark className="size-4.5" />
        </span>
        <div>
          <CardTitle as="h2" className="text-base">Cash on hand</CardTitle>
          <CardDescription>
            Your GCash, bank, and cash accounts — feeds the Dashboard&apos;s money totals.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!accounts ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col gap-2">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-end gap-2 rounded-lg border border-border p-3 text-sm">
                <div className="flex-1 space-y-1">
                  <div className="font-medium">{account.name}</div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing[account.id] ?? account.amount}
                    onChange={(e) => setEditing({ ...editing, [account.id]: e.target.value })}
                    onBlur={() => saveAmount(account)}
                  />
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => remove(account)}
                  aria-label={`Delete ${account.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {accounts.length > 0 && (
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={add} className="flex items-end gap-2 border-t border-border pt-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="cash_account_name">Add an account</Label>
            <Input
              id="cash_account_name"
              required
              placeholder="e.g. GCash"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="w-32 space-y-1.5">
            <Label htmlFor="cash_account_amount">Amount</Label>
            <Input
              id="cash_account_amount"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
