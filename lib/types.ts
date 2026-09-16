export interface AuthUser {
  id: number;
  name: string;
  email: string;
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
  email: string | null;
  phone: string | null;
  location: string | null;
  total_loan: string;
  total_paid: string;
  interest_rate: string;
  interest_amount: number;
  balance: number;
  is_overdue: boolean;
  status: LoanStatus;
  notes: string | null;
  start_date: string;
  due_date: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface LoanFormValues {
  name: string;
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
