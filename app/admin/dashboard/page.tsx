"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Banknote, HandCoins, Landmark, TriangleAlert, Users } from "lucide-react";
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
import type { LendingBudgetSettings, Loan } from "@/lib/types";

export default function AdminDashboardPage() {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState("");
  const [remainingBudget, setRemainingBudget] = useState<{ remaining: number | null } | null>(null);
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

    // Admin-only endpoint — a 403 for other staff (or no budget set) just
    // means the card isn't shown.
    api
      .get("/settings/lending-budget")
      .then((res) => setRemainingBudget({ remaining: (res.data as LendingBudgetSettings).remaining_budget }))
      .catch(() => setRemainingBudget(null));
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

  const totalLoaned = loans.reduce((sum, l) => sum + Number(l.total_loan), 0);
  const totalPaid = loans.reduce((sum, l) => sum + Number(l.total_paid), 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + Number(l.balance), 0);
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
      label: "Total loaned out",
      value: formatCurrency(totalLoaned),
      icon: HandCoins,
      tone: 2,
    },
    {
      label: "Total collected",
      value: formatCurrency(totalPaid),
      icon: Banknote,
      tone: 3,
    },
    {
      label: "Outstanding balance",
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of every loan in the system.
        </p>
      </div>

      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${stats.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
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
