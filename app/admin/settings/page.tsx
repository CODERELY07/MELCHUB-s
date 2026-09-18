"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Bell, Loader2, Save, Wallet } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { NotificationSettings, PaymentSettings } from "@/lib/types";

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

  useEffect(() => {
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
    </div>
  );
}
