// -----------------------------------------------------------------------------
// Contract message protocol (matches backend)
// -----------------------------------------------------------------------------

export interface ContractMessage {
  Service: string;
  Action: string;
  data?: unknown;
}

export interface ContractResponse<T = unknown> {
  success?: T;
  error?: unknown;
  promiseId?: string;
}

// -----------------------------------------------------------------------------
// Domain types (mirrors backend outputs EXACTLY)
// -----------------------------------------------------------------------------

export type SalaryType = 'MONTHLY' | 'HOURLY';
export type PayCycleStatus = 'OPEN' | 'CLOSED';

export interface Employee {
  id: number;
  name: string;
  salaryType: SalaryType;
  salaryAmount: number;
  currency: string;
  isActive: boolean;
  createdOn: string;
  lastUpdatedOn: string;
  concurrencyKey: string;
}

export interface PayCycle {
  id: number;
  startDate: string;
  endDate: string;
  status: PayCycleStatus;
  createdOn: string;
  lastUpdatedOn: string;
  concurrencyKey: string;
}

// NOTE: PayrollService returns raw DB rows for payments.
export interface PaymentRow {
  Id: number;
  PayCycleId: number;
  EmployeeId: number;
  GrossAmount: number;
  Currency: string;
  PaidOn: string;
  Notes: string;
}

// -----------------------------------------------------------------------------
// Inputs (mirrors backend expected data payloads)
// -----------------------------------------------------------------------------

export interface AddEmployeeInput {
  name: string;
  salaryType: SalaryType;
  salaryAmount: number;
  currency?: string;
}

export interface UpdateEmployeeInput {
  id: number;
  concurrencyKey: string;
  name?: string;
  salaryType?: SalaryType;
  salaryAmount?: number;
  currency?: string;
  isActive?: boolean;
}

export interface RemoveEmployeeInput {
  id: number;
  concurrencyKey: string;
}

export interface CreatePayCycleInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface ClosePayCycleInput {
  id: number;
  concurrencyKey: string;
}

export interface AddWorkLogInput {
  payCycleId: number;
  employeeId: number;
  workDate: string; // YYYY-MM-DD
  hours: number;
}

export interface ProcessPayrollInput {
  payCycleId: number;
}

export interface GetByIdInput {
  id: number;
}

export interface GetPaymentsByCycleInput {
  payCycleId: number;
}

export interface GetPaymentsByEmployeeInput {
  employeeId: number;
}

export interface ClusterUnl {
  unl: string[];
}

export interface ContractVersion {
  version: number | string;
}

export interface UpdateClusterConfigInput {
  action: 'add' | 'remove';
  publicKey: string;
}

export interface UpdateClusterDetailsInput {
  clusterDetails: Array<{
    domain?: string;
    peer_port?: number;
    pubkey?: string;
  }>;
}
