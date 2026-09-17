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

export interface Loan {
  id: number;
  loan_number: string | null;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  total_loan: string;
  total_paid: string;
  interest_rate: string;
  penalty_amount: string;
  interest_amount: number;
  balance: number;
  is_overdue: boolean;
  status: LoanStatus;
  notes: string | null;
  start_date: string;
  due_date: string;
  closed_at: string | null;
  terms_accepted_at: string | null;
  terms_signature_name: string | null;
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

export type PaymentProofStatus = "pending" | "approved" | "rejected";

export interface PaymentProof {
  id: number;
  loan_id: number;
  amount: string;
  drive_file_id: string;
  drive_file_url: string;
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

export interface LoanFormValues {
  name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  location: string;
  total_loan: string;
  total_paid: string;
  interest_rate: string;
  status: LoanStatus;
  notes: string;
  start_date: string;
  due_date: string;
}
