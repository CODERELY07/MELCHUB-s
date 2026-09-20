"use client";

import { useEffect, useState } from "react";

import api from "@/lib/axios";
import borrowerApi from "@/lib/borrower-axios";
import { cachedGet } from "@/lib/offline-cache";
import type { RepaymentPlanRecord } from "@/lib/types";

/**
 * The admin-defined repayment plans. `as` picks which token the request
 * goes out with — staff pages use "staff", the borrower portal "borrower"
 * (the server hides inactive plans from borrowers).
 */
export function useRepaymentPlans(as: "staff" | "borrower", enabled = true) {
  const [plans, setPlans] = useState<RepaymentPlanRecord[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const client = as === "staff" ? api : borrowerApi;
    cachedGet(`plans-${as}`, () =>
      client.get("/repayment-plans").then((res) => res.data as RepaymentPlanRecord[])
    )
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [as, enabled]);

  return plans;
}

/** Fraction of principal due per installment: an even share plus that period's interest. */
export function installmentRate(plan: RepaymentPlanRecord): number {
  return 1 / plan.installments + (Number(plan.daily_rate) / 100) * plan.period_days;
}
