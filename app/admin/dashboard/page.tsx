"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Banknote, HandCoins, Landmark, PiggyBank, TriangleAlert, Users, Wallet } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import { LOGIN_PATH } from "@/lib/auth-context";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard, type StatTone } from "@/components/ui/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { CashAccount, LendingBudgetSettings, Loan } from "@/lib/types";

export default function AdminDashboardPage() {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState("");
  const [remainingBudget, setRemainingBudget] = useState<{ remaining: number | null } | null>(null);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    api
      .get("/loans")
      .then((res) => setLoans(res.data))
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push(LOGIN_PATH);
          return;
        }
        setError("Couldn't load loans.");
      });

    // Admin-only endpoints — a 403 for other staff just means those cards
    // aren't shown (no budget set behaves the same way for the budget one).
    api
      .get("/settings/lending-budget")
      .then((res) => setRemainingBudget({ remaining: (res.data as LendingBudgetSettings).remaining_budget }))
      .catch(() => setRemainingBudget(null));

    api
      .get("/cash-accounts")
      .then((res) => setCashAccounts(res.data))
      .catch(() => setCashAccounts(null));
  }, [router]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!loans) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Money figures cover only loans still running — fully paid, cancelled and
  // defaulted loans are finished, so they don't count as "out" or "owed".
  const running = loans.filter((l) => !["paid", "cancelled", "defaulted"].includes(l.status));
  // Principal still unpaid: payments reduce what's out (interest and fees don't add to it).
  const totalLoaned = running.reduce((sum, l) => sum + Math.max(0, Number(l.total_loan) - Number(l.total_paid)), 0);
  const totalPaid = running.reduce((sum, l) => sum + Number(l.total_paid), 0);
  const totalOutstanding = running.reduce((sum, l) => sum + Number(l.balance), 0);
  const overdueCount = loans.filter((l) => l.is_overdue).length;
  const activeCount = loans.filter((l) => l.status === "active").length;

  const stats: { label: string; value: string; icon: typeof Users; tone: StatTone }[] = [
    {
      label: "Total borrowers",
      value: String(loans.length),
      icon: Users,
      tone: 1,
    },
    {
      label: "Loaned out (unpaid principal)",
      value: formatCurrency(totalLoaned),
      icon: HandCoins,
      tone: 2,
    },
    {
      label: "Collected (active loans)",
      value: formatCurrency(totalPaid),
      icon: Banknote,
      tone: 3,
    },
    {
      label: "Outstanding balance (active)",
      value: formatCurrency(totalOutstanding),
      icon: AlertCircle,
      tone: 4,
    },
  ];

  if (remainingBudget !== null) {
    stats.push({
      label: "Available to lend",
      value: remainingBudget.remaining !== null ? formatCurrency(remainingBudget.remaining) : "Not set",
      icon: Landmark,
      tone: 5,
    });
  }

  if (cashAccounts !== null) {
    // "Money on hand" — cash accounts (GCash, bank, drawer, …) plus what's
    // currently out on loan at face value, no interest. "Money with
    // interest" swaps that for the full outstanding balance (principal +
    // interest + fees still owed), i.e. what's on hand if everything still
    // out got collected in full. Both let through even with zero accounts
    // set up (just equal the loan-side figures), so the cards teach
    // themselves rather than staying hidden until configured.
    const totalCash = cashAccounts.reduce((sum, a) => sum + Number(a.amount), 0);
    stats.push(
      {
        label: "Money on hand",
        value: formatCurrency(totalCash + totalLoaned),
        icon: Wallet,
        tone: 3,
      },
      {
        label: "Money with interest",
        value: formatCurrency(totalCash + totalOutstanding),
        icon: PiggyBank,
        tone: 4,
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of every loan in the system.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>

      {overdueCount > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertDescription>
            {overdueCount} loan{overdueCount > 1 ? "s are" : " is"} past its
            due date and still unpaid.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="!flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-ink">
            <Landmark className="size-5" />
          </span>
          <div>
            <CardTitle as="h2">Active loans</CardTitle>
            <CardDescription>{activeCount} currently active</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
