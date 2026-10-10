"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { AlertCircle, Banknote, ChartPie, Download, HandCoins, Loader2, TrendingUp, TriangleAlert } from "lucide-react";

import api from "@/lib/axios";
import { LOGIN_PATH } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { formatCurrency } from "@/lib/format";
import { downloadAnalyticsPdf } from "@/lib/analytics-pdf";
import { useI18n } from "@/lib/i18n";
import type { AnalyticsData, LoanStatus } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--color-muted-foreground)",
  active: "var(--color-primary)",
  paid: "var(--color-success)",
  overdue: "var(--color-warning)",
  defaulted: "var(--color-destructive)",
  cancelled: "var(--color-muted-foreground)",
};

function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-PH", { month: "short" });
}

export default function AdminAnalyticsPage() {
  const { t } = useI18n();
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
          router.push(LOGIN_PATH);
          return;
        }
        setError(t("reports.loadError"));
      });
  }, [router, t]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.reports")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => downloadAnalyticsPdf(data)} className="self-start sm:self-auto">
          <Download className="size-4" />
          {t("reports.download")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("reports.lent")} value={formatCurrency(totals.total_loaned)} hint={t("reports.lentHint")} icon={HandCoins} tone={2} />
        <StatCard label={t("reports.collected")} value={formatCurrency(totals.total_collected)} hint={t("reports.collectedHint")} icon={Banknote} tone={3} />
        <StatCard label={t("reports.owed")} value={formatCurrency(totals.total_outstanding)} hint={t("reports.owedHint")} icon={AlertCircle} tone={4} />
        <StatCard label={t("reports.late")} value={String(totals.overdue_count)} hint={t("reports.lateHint")} icon={TriangleAlert} tone={5} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-1/15 text-data-1">
              <TrendingUp className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">{t("reports.newLoans")}</CardTitle>
              <CardDescription>{t("reports.newLoansDesc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              title={t("reports.newLoans")}
              data={monthly_loans.map((m) => ({ label: monthLabel(m.month), value: m.count }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="!flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-ink">
              <Banknote className="size-4.5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-base">{t("reports.collections")}</CardTitle>
              <CardDescription>{t("reports.collectionsDesc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              title={t("reports.collections")}
              data={monthly_collections.map((m) => ({ label: monthLabel(m.month), value: m.amount }))}
              formatValue={(v) => formatCurrency(v)}
              barColor="var(--color-success)"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="!flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-5/15 text-data-5">
            <ChartPie className="size-4.5" />
          </span>
          <div>
            <CardTitle as="h2" className="text-base">{t("reports.statuses")}</CardTitle>
            <CardDescription>{t("reports.statusesDesc", { count: totals.loan_count })}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DonutChart
            data={status_breakdown.map((s) => ({
              label: t(`status.${s.status as LoanStatus}`),
              value: s.count,
              color: STATUS_COLORS[s.status] ?? "var(--color-muted-foreground)",
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
