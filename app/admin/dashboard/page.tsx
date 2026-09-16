"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Banknote, HandCoins, TriangleAlert, Users } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { Loan } from "@/lib/types";

export default function AdminDashboardPage() {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    api
      .get("/loans")
      .then((res) => setLoans(res.data))
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError("Couldn't load loans.");
      });
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

  const stats = [
    { label: "Total borrowers", value: String(loans.length), icon: Users },
    { label: "Total loaned out", value: formatCurrency(totalLoaned), icon: HandCoins },
    { label: "Total collected", value: formatCurrency(totalPaid), icon: Banknote },
    {
      label: "Outstanding balance",
      value: formatCurrency(totalOutstanding),
      icon: AlertCircle,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of every loan in the system.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <stat.icon className="size-3.5" />
                {stat.label}
              </CardDescription>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
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
        <CardHeader>
          <CardTitle>Active loans</CardTitle>
          <CardDescription>{activeCount} currently active</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
