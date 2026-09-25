export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  roles: string[];
  permissions: string[];
}

export type LoanStatus =
  | "pending"
  | "active"
  | "paid"
  | "overdue"
  | "defaulted"
  | "cancelled";

/** A repayment plan's `key` — admin-defined, so any string (built-ins: "3_day", "weekly"). */
export type RepaymentPlan = string;

/** An admin-defined "money on hand" account (GCash, a bank, cash in a drawer, …). */
export interface CashAccount {
  id: number;
  name: string;
  amount: string;
}

export interface RepaymentPlanRecord {
  id: number;
  key: string;
  name: string;
  period_days: number;
  installments: number;
  daily_rate: string;
  is_active: boolean;
}

/**
 * A borrower's identity/login — a borrower can have several Loans over
 * time (pay one off, borrow again later), so this is separate from Loan.
 */
export interface Borrower {
  id: number;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  credit_limit: string | null;
  /** Loan::remainingBudget()-capped total across ALL of this borrower's loans combined. */
  available_credit: number | null;
  terms_accepted_at: string | null;
  terms_signature_name: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  borrower_id: number;
  loan_number: string | null;
  /** name/username/email/phone/location/credit_limit are read-only pass-throughs from the borrower — see server Loan::name() etc. */
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  credit_limit: string | null;
  total_loan: string;
  total_paid: string;
  interest_rate: string;
  repayment_plan: RepaymentPlan;
  installments_enabled: boolean;
  plan_name: string | null;
  plan_period_days: number;
  penalty_amount: string;
  interest_amount: number;
  balance: number;
  is_overdue: boolean;
  status: LoanStatus;
  notes: string | null;
  start_date: string | null;
  due_date: string | null;
  closed_at: string | null;
  last_notified_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface LoanHistoryEntry {
  type: "interest" | "payment" | "penalty";
  date: string;
  amount: number;
  day?: number;
  note?: string | null;
  recorded_by?: string | null;
}

export interface PaymentSettings {
  gcash_name: string;
  gcash_number: string;
}

export interface NotificationSettings {
  admin_notify_phone: string;
}

export interface LendingBudgetSettings {
  lending_budget: string;
  remaining_budget: number | null;
}

export interface LoanDefaultsSettings {
  late_fee_amount: string;
}

export interface SmsLogEntry {
  id: number;
  loan_id: number | null;
  phone: string;
  message: string;
  success: boolean;
  error: string | null;
  created_at: string;
}

export type PaymentProofStatus = "pending" | "approved" | "rejected";

export interface PaymentProof {
  id: number;
  loan_id: number;
  amount: string;
  file_path: string;
  file_url: string;
  status: PaymentProofStatus;
  note: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  loan_payment_id: number | null;
  created_at: string;
  updated_at: string;
  loan?: Pick<Loan, "id" | "loan_number" | "name" | "phone">;
  reviewer?: { id: number; name: string } | null;
}

export interface AnalyticsData {
  totals: {
    loan_count: number;
    total_loaned: number;
    total_collected: number;
    total_outstanding: number;
    overdue_count: number;
    active_count: number;
    paid_count: number;
  };
  status_breakdown: { status: LoanStatus; count: number }[];
  monthly_loans: { month: string; count: number; amount: number }[];
  monthly_collections: { month: string; amount: number }[];
}

export type LoanRequestPlan = string;
export type LoanRequestStatus = "pending" | "accepted" | "declined";

export interface LoanRequest {
  id: number;
  borrower_id: number;
  plan: LoanRequestPlan;
  requested_amount: string;
  message: string | null;
  rules_acknowledged_at: string;
  status: LoanRequestStatus;
  admin_note: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  borrower?: Pick<Borrower, "id" | "name" | "username" | "phone" | "credit_limit" | "available_credit">;
  reviewer?: { id: number; name: string } | null;
}

export interface LoanFormValues {
  /** Set only when creating a new loan for an EXISTING borrower — identity fields below are then unused. */
  borrower_id?: number;
  name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  location: string;
  total_loan: string;
  credit_limit: string;
  total_paid: string;
  interest_rate: string;
  repayment_plan: RepaymentPlan;
  installments_enabled: boolean;
  status: LoanStatus;
  notes: string;
  start_date: string;
  due_date: string;
}
