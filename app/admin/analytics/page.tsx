"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Download, Loader2 } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { formatCurrency } from "@/lib/format";
import { downloadAnalyticsPdf } from "@/lib/analytics-pdf";
import type { AnalyticsData } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--color-muted-foreground)",
  active: "var(--color-primary)",
  paid: "#10b981",
  overdue: "#f59e0b",
  defaulted: "var(--color-destructive)",
  cancelled: "var(--color-muted-foreground)",
};

function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-PH", { month: "short" });
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    api
      .get("/analytics")
      .then((res) => setData(res.data))
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError("Couldn't load analytics.");
      });
  }, [router]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { totals, status_breakdown, monthly_loans, monthly_collections } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            A full picture of your lending activity, past 12 months.
          </p>
        </div>
        <Button variant="outline" onClick={() => downloadAnalyticsPdf(data)}>
          <Download className="size-4" />
          Download PDF
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total loaned out</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.total_loaned)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total collected</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.total_collected)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding balance</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.total_outstanding)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Overdue loans</CardDescription>
            <CardTitle className="text-2xl">{totals.overdue_count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loans created per month</CardTitle>
            <CardDescription>Count of new loans, last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={monthly_loans.map((m) => ({ label: monthLabel(m.month), value: m.count }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collections per month</CardTitle>
            <CardDescription>Total payments received, last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={monthly_collections.map((m) => ({ label: monthLabel(m.month), value: m.amount }))}
              formatValue={(v) => formatCurrency(v)}
              barColor="#10b981"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loan status breakdown</CardTitle>
          <CardDescription>{totals.loan_count} loans total</CardDescription>
        </CardHeader>
        <CardContent>
          <DonutChart
            data={status_breakdown.map((s) => ({
              label: s.status,
              value: s.count,
              color: STATUS_COLORS[s.status] ?? "var(--color-muted-foreground)",
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
