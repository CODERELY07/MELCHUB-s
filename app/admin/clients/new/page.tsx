"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2, UserPlus } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientFormValues {
  name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  location: string;
}

const EMPTY_FORM: ClientFormValues = {
  name: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  location: "",
};

/**
 * A dedicated page for onboarding a new borrower — name, login, and contact
 * details only, no loan terms. Separate from the "New loan" modal on the
 * Loans table (client/app/admin/loans/page.tsx), which can either create
 * this same kind of bare account (when its "New borrower" toggle is used
 * with no principal filled in) or add a loan to an existing one. This page
 * submits to POST /loans with no `total_loan`, so the backend
 * (LoansController::store()) creates only a Borrower row — a client with
 * zero loans yet — for a real loan to be added later the same way a second
 * one would be. See docs/loans.md's borrower/loan split for the full model.
 */
export default function NewClientPage() {
  const [form, setForm] = useState<ClientFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    if (!payload.password) delete payload.password;

    try {
      await api.post("/loans", payload);
      router.push("/admin/loans");
    } catch (err: unknown) {
      const responseData = isAxiosError(err) ? err.response?.data : undefined;
      const messages = responseData?.errors as Record<string, string[]> | undefined;
      setFormError(
        messages
          ? Object.values(messages).flat().join(" ")
          : responseData?.message || "Couldn't create this client."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Client</h1>
        <p className="text-sm text-muted-foreground">
          Create a client account. Loan terms (principal, rate, dates) are set separately, once they&apos;re ready to borrow.
        </p>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-1/15 text-data-1">
              <UserPlus className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">Client details</CardTitle>
              <CardDescription>
                This creates their login for the borrower portal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="09XXXXXXXXX"
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
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/loans")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Create client
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
