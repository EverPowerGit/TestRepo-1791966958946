import ContractService from './contract-service';
import type {
  AddEmployeeInput,
  ClosePayCycleInput,
  CreatePayCycleInput,
  Employee,
  GetByIdInput,
  PayCycle,
  PaymentRow,
  ProcessPayrollInput,
  RemoveEmployeeInput,
  AddWorkLogInput,
  UpdateEmployeeInput,
  GetPaymentsByCycleInput,
  GetPaymentsByEmployeeInput,
  ClusterUnl,
  ContractVersion,
  UpdateClusterConfigInput,
  UpdateClusterDetailsInput,
} from '../types';

export default class ApiService {
  private static instance: ApiService;
  private readonly contract: ContractService;

  private constructor() {
    this.contract = ContractService.getInstance();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) ApiService.instance = new ApiService();
    return ApiService.instance;
  }

  // ---------------------------------------------------------------------------
  // Employee
  // ---------------------------------------------------------------------------

  async getAllEmployees(): Promise<Employee[]> {
    const res = await this.contract.submitContractReadRequest<Employee[]>({
      Service: 'Employee',
      Action: 'GetAllEmployees',
    });
    return res ?? [];
  }

  async getEmployeeById(input: GetByIdInput): Promise<Employee> {
    return this.contract.submitContractReadRequest<Employee>({
      Service: 'Employee',
      Action: 'GetEmployeeById',
      data: input,
    });
  }

  async addEmployee(input: AddEmployeeInput): Promise<{ employeeId: number }> {
    return this.contract.submitInputToContract<{ employeeId: number }>({
      Service: 'Employee',
      Action: 'AddEmployee',
      data: input,
    });
  }

  async updateEmployee(input: UpdateEmployeeInput): Promise<{ updated: true; concurrencyKey: string }> {
    return this.contract.submitInputToContract<{ updated: true; concurrencyKey: string }>({
      Service: 'Employee',
      Action: 'UpdateEmployee',
      data: input,
    });
  }

  async removeEmployee(input: RemoveEmployeeInput): Promise<{ removed: true; concurrencyKey: string }> {
    return this.contract.submitInputToContract<{ removed: true; concurrencyKey: string }>({
      Service: 'Employee',
      Action: 'RemoveEmployee',
      data: input,
    });
  }

  // ---------------------------------------------------------------------------
  // Payroll / PayCycle
  // ---------------------------------------------------------------------------

  async listPayCycles(): Promise<PayCycle[]> {
    const res = await this.contract.submitContractReadRequest<PayCycle[]>({
      Service: 'Payroll',
      Action: 'ListPayCycles',
    });
    return res ?? [];
  }

  async getPayCycleById(input: GetByIdInput): Promise<PayCycle> {
    return this.contract.submitContractReadRequest<PayCycle>({
      Service: 'Payroll',
      Action: 'GetPayCycleById',
      data: input,
    });
  }

  async createPayCycle(input: CreatePayCycleInput): Promise<{ payCycleId: number }> {
    return this.contract.submitInputToContract<{ payCycleId: number }>({
      Service: 'Payroll',
      Action: 'CreatePayCycle',
      data: input,
    });
  }

  async closePayCycle(input: ClosePayCycleInput): Promise<{ closed: true; concurrencyKey: string }> {
    return this.contract.submitInputToContract<{ closed: true; concurrencyKey: string }>({
      Service: 'Payroll',
      Action: 'ClosePayCycle',
      data: input,
    });
  }

  async addWorkLog(input: AddWorkLogInput): Promise<{ workLogId: number }> {
    return this.contract.submitInputToContract<{ workLogId: number }>({
      Service: 'Payroll',
      Action: 'AddWorkLog',
      data: input,
    });
  }

  async processPayroll(input: ProcessPayrollInput): Promise<{ processed: true; paymentsCreated: number }> {
    return this.contract.submitInputToContract<{ processed: true; paymentsCreated: number }>({
      Service: 'Payroll',
      Action: 'ProcessPayroll',
      data: input,
    });
  }

  async getPaymentsByCycle(input: GetPaymentsByCycleInput): Promise<PaymentRow[]> {
    const res = await this.contract.submitContractReadRequest<PaymentRow[]>({
      Service: 'Payroll',
      Action: 'GetPaymentsByCycle',
      data: input,
    });
    return res ?? [];
  }

  async getPaymentsByEmployee(input: GetPaymentsByEmployeeInput): Promise<PaymentRow[]> {
    const res = await this.contract.submitContractReadRequest<PaymentRow[]>({
      Service: 'Payroll',
      Action: 'GetPaymentsByEmployee',
      data: input,
    });
    return res ?? [];
  }

  // ---------------------------------------------------------------------------
  // Cluster
  // ---------------------------------------------------------------------------

  async getContractVersion(): Promise<ContractVersion> {
    return this.contract.submitContractReadRequest<ContractVersion>({
      Service: 'Cluster',
      Action: 'GetContractVersion',
    });
  }

  async getClusterUnl(): Promise<ClusterUnl> {
    return this.contract.submitContractReadRequest<ClusterUnl>({
      Service: 'Cluster',
      Action: 'GetClusterUnl',
    });
  }

  async updateClusterConfig(input: UpdateClusterConfigInput): Promise<{ success: unknown } | unknown> {
    // Backend returns { success: result } where result is whatever context.updateConfig returns.
    return this.contract.submitInputToContract<{ success: unknown } | unknown>({
      Service: 'Cluster',
      Action: 'UpdateClusterConfig',
      data: input,
    });
  }

  async updateClusterDetails(input: UpdateClusterDetailsInput): Promise<{ peers: string[] } | unknown> {
    return this.contract.submitInputToContract<{ peers: string[] } | unknown>({
      Service: 'Cluster',
      Action: 'UpdateClusterDetails',
      data: input,
    });
  }
}
