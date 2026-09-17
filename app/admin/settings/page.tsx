"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, Save } from "lucide-react";

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
import type { PaymentSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<PaymentSettings>({ gcash_name: "", gcash_number: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .get("/settings/payment")
      .then((res) => setForm(res.data))
      .finally(() => setLoading(false));
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

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          The GCash details shown to borrowers on their dashboard and in SMS reminders.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base">GCash payment account</CardTitle>
            <CardDescription>Shown to every borrower, everywhere payment is requested.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
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
    </div>
  );
}
