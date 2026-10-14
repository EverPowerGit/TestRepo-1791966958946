import * as bson from 'bson';
import type { Document } from 'bson';
import type { ContractMessage, ContractResponse } from '../types';

const HotPocket = (window as any).HotPocket;

interface PendingPromise {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

function isPlaceholderUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes('example') || u.includes('placeholder') || u.includes('your-server');
}

function u8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default class ContractService {
  private static instance: ContractService;

  private client: any = null;
  private keyPair: any = null;
  private connected = false;
  private mockMode = false;
  private readonly promiseMap = new Map<string, PendingPromise>();

  private readonly servers: string[] = (import.meta.env.VITE_CONTRACT_URLS ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => Boolean(s));

  // --- Mock state ---
  private mockEmployees: any[] = [
    {
      id: 1,
      name: 'Alice Johnson',
      salaryType: 'HOURLY',
      salaryAmount: 25,
      currency: 'USD',
      isActive: true,
      createdOn: new Date(Date.now() - 86400000 * 10).toISOString(),
      lastUpdatedOn: new Date(Date.now() - 86400000 * 2).toISOString(),
      concurrencyKey: '0x0000000000000001',
    },
    {
      id: 2,
      name: 'Ben Carter',
      salaryType: 'MONTHLY',
      salaryAmount: 5200,
      currency: 'USD',
      isActive: true,
      createdOn: new Date(Date.now() - 86400000 * 20).toISOString(),
      lastUpdatedOn: new Date(Date.now() - 86400000 * 5).toISOString(),
      concurrencyKey: '0x0000000000000002',
    },
  ];
  private mockPayCycles: any[] = [
    {
      id: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'CLOSED',
      createdOn: new Date(Date.now() - 86400000 * 40).toISOString(),
      lastUpdatedOn: new Date(Date.now() - 86400000 * 35).toISOString(),
      concurrencyKey: '0x0000000000000101',
    },
    {
      id: 2,
      startDate: '2026-01-16',
      endDate: '2026-01-31',
      status: 'OPEN',
      createdOn: new Date(Date.now() - 86400000 * 15).toISOString(),
      lastUpdatedOn: new Date(Date.now() - 86400000 * 10).toISOString(),
      concurrencyKey: '0x0000000000000102',
    },
  ];
  private mockWorkLogs: any[] = [
    { Id: 1, PayCycleId: 2, EmployeeId: 1, WorkDate: '2026-01-18', Hours: 8, CreatedOn: new Date().toISOString() },
    { Id: 2, PayCycleId: 2, EmployeeId: 1, WorkDate: '2026-01-19', Hours: 6.5, CreatedOn: new Date().toISOString() },
  ];
  private mockPayments: any[] = [
    {
      Id: 1,
      PayCycleId: 1,
      EmployeeId: 1,
      GrossAmount: 400,
      Currency: 'USD',
      PaidOn: new Date(Date.now() - 86400000 * 34).toISOString(),
      Notes: 'Processed in-contract (record only)',
    },
    {
      Id: 2,
      PayCycleId: 1,
      EmployeeId: 2,
      GrossAmount: 5200,
      Currency: 'USD',
      PaidOn: new Date(Date.now() - 86400000 * 34).toISOString(),
      Notes: 'Processed in-contract (record only)',
    },
  ];
  private mockNextEmployeeId = 3;
  private mockNextCycleId = 3;
  private mockNextWorkLogId = 3;
  private mockNextPaymentId = 3;

  private constructor() {}

  static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  getPublicKeyHex(): string | null {
    const pk: Uint8Array | undefined = this.keyPair?.publicKey;
    if (!pk) return null;
    return u8ToHex(pk);
  }

  async init(): Promise<boolean> {
    const envMock = import.meta.env.VITE_MOCK_MODE === 'true';
    const noUrls = this.servers.length === 0;
    const placeholder = this.servers.some((s: string) => isPlaceholderUrl(s));

    if (envMock || noUrls || placeholder || !HotPocket) {
      this.mockMode = true;
      console.warn(
        '[PayPilot] Running in MOCK MODE. Set VITE_MOCK_MODE=false and configure VITE_CONTRACT_URLS to connect to a real HotPocket cluster.',
      );
      // create a fake keyPair so UI can still show something
      if (!this.keyPair) {
        const bytes = new Uint8Array(32);
        window.crypto.getRandomValues(bytes);
        this.keyPair = { publicKey: bytes };
      }
      return true;
    }

    if (!this.keyPair) this.keyPair = await HotPocket.generateKeys();

    if (!this.client) {
      this.client = await HotPocket.createClient(this.servers, this.keyPair, {
        protocol: HotPocket.protocols.bson,
      });
    }

    if (!this.client || typeof this.client.connect !== 'function') {
      throw new Error(
        'Failed to create HotPocket client. Check VITE_CONTRACT_URLS, ensure nodes are reachable, or enable VITE_MOCK_MODE=true.',
      );
    }

    this.registerEvents();

    if (!this.connected) {
      const ok = await this.client.connect();
      if (!ok) {
        throw new Error(
          'HotPocket connection failed. Verify your contract servers are running and reachable (wss:// URLs), or enable VITE_MOCK_MODE=true.',
        );
      }
      this.connected = true;
    }

    return true;
  }

  private registerEvents(): void {
    this.client.on(HotPocket.events.disconnect, () => {
      this.connected = false;
      window.location.reload();
    });

    this.client.on(HotPocket.events.connectionChange, (server: string, action: string) => {
      console.log(`HotPocket ${action}: ${server}`);
    });

    this.client.on(HotPocket.events.contractOutput, (r: { outputs: unknown[] }) => {
      r.outputs.forEach((output: unknown) => {
        const parsed = this.deserialize<ContractResponse>(output);
        const pId = parsed.promiseId;
        if (!pId) return;
        const pending = this.promiseMap.get(pId);
        if (!pending) return;

        if (parsed.error) pending.reject(parsed.error);
        else pending.resolve(parsed.success);

        this.promiseMap.delete(pId);
      });
    });

    this.client.on(HotPocket.events.healthEvent, (ev: unknown) => {
      console.log('[HotPocket healthEvent]', ev);
    });
  }

  async submitContractReadRequest<T = unknown>(message: ContractMessage): Promise<T> {
    if (this.mockMode) return this.mockResponse<T>(message);

    const output = await this.client.submitContractReadRequest(this.serialize(message));
    const parsed = this.deserialize<ContractResponse<T>>(output);
    if (parsed.error) {
      const msg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
      throw new Error(msg);
    }
    return (parsed.success ?? null) as T;
  }

  async submitInputToContract<T = unknown>(message: ContractMessage): Promise<T> {
    if (this.mockMode) return this.mockResponse<T>(message);

    const promiseId = this.getUniqueId();
    const result = new Promise<T>((resolve, reject) => {
      this.promiseMap.set(promiseId, {
        resolve: resolve as (value: any) => void,
        reject,
      });
    });

    const input = await this.client.submitContractInput(this.serialize({ promiseId, ...message }));
    const status = await input?.submissionStatus;
    if (status?.status !== 'accepted') {
      this.promiseMap.delete(promiseId);
      throw new Error(`Ledger rejection: ${status?.reason ?? 'Unknown reason'}`);
    }

    return result;
  }

  private serialize(payload: unknown): Uint8Array {
    // bson.serialize expects a BSON "Document" object.
    return bson.serialize(payload as Document);
  }

  private deserialize<T>(output: unknown): T {
    if (output instanceof Uint8Array) {
      return bson.deserialize(output) as T;
    }
    if (output instanceof ArrayBuffer) {
      return bson.deserialize(new Uint8Array(output)) as T;
    }
    // Some environments may already give an object.
    return output as T;
  }

  private getUniqueId(): string {
    const bytes = new Uint8Array(10);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async mockResponse<T>(message: ContractMessage): Promise<T> {
    await new Promise<void>((r) => setTimeout(r, 160));

    const svc = message.Service;
    const act = message.Action;
    const data: any = message.data ?? {};

    // --- Employee ---
    if (svc === 'Employee' && act === 'GetAllEmployees') {
      return [...this.mockEmployees] as unknown as T;
    }
    if (svc === 'Employee' && act === 'GetEmployeeById') {
      const id = Number(data.id);
      const found = this.mockEmployees.find((e: any) => e.id === id) ?? null;
      return found as unknown as T;
    }
    if (svc === 'Employee' && act === 'AddEmployee') {
      const now = new Date().toISOString();
      const newEmp = {
        id: this.mockNextEmployeeId++,
        name: String(data.name ?? '').trim(),
        salaryType: String(data.salaryType ?? 'MONTHLY'),
        salaryAmount: Number(data.salaryAmount ?? 0),
        currency: String(data.currency ?? 'USD').toUpperCase(),
        isActive: true,
        createdOn: now,
        lastUpdatedOn: now,
        concurrencyKey: `0x000000000000${(this.mockNextEmployeeId + 1000).toString(16).padStart(4, '0')}`,
      };
      this.mockEmployees.push(newEmp);
      return { employeeId: newEmp.id } as unknown as T;
    }
    if (svc === 'Employee' && act === 'UpdateEmployee') {
      const id = Number(data.id);
      const idx = this.mockEmployees.findIndex((e: any) => e.id === id);
      if (idx < 0) throw new Error('Employee not found');
      const existing = this.mockEmployees[idx];
      const updated = {
        ...existing,
        name: data.name !== undefined ? String(data.name).trim() : existing.name,
        salaryType: data.salaryType !== undefined ? String(data.salaryType) : existing.salaryType,
        salaryAmount: data.salaryAmount !== undefined ? Number(data.salaryAmount) : existing.salaryAmount,
        currency: data.currency !== undefined ? String(data.currency).toUpperCase() : existing.currency,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
        lastUpdatedOn: new Date().toISOString(),
        concurrencyKey: `0x000000000000${(Date.now() % 65535).toString(16).padStart(4, '0')}`,
      };
      this.mockEmployees[idx] = updated;
      return { updated: true, concurrencyKey: updated.concurrencyKey } as unknown as T;
    }
    if (svc === 'Employee' && act === 'RemoveEmployee') {
      const id = Number(data.id);
      const idx = this.mockEmployees.findIndex((e: any) => e.id === id);
      if (idx < 0) throw new Error('Employee not found');
      const existing = this.mockEmployees[idx];
      const updated = {
        ...existing,
        isActive: false,
        lastUpdatedOn: new Date().toISOString(),
        concurrencyKey: `0x000000000000${(Date.now() % 65535).toString(16).padStart(4, '0')}`,
      };
      this.mockEmployees[idx] = updated;
      return { removed: true, concurrencyKey: updated.concurrencyKey } as unknown as T;
    }

    // --- Payroll / PayCycle ---
    if (svc === 'Payroll' && act === 'ListPayCycles') {
      return [...this.mockPayCycles] as unknown as T;
    }
    if (svc === 'Payroll' && act === 'GetPayCycleById') {
      const id = Number(data.id);
      const found = this.mockPayCycles.find((c: any) => c.id === id) ?? null;
      return found as unknown as T;
    }
    if (svc === 'Payroll' && act === 'CreatePayCycle') {
      const now = new Date().toISOString();
      const cycle = {
        id: this.mockNextCycleId++,
        startDate: String(data.startDate),
        endDate: String(data.endDate),
        status: 'OPEN',
        createdOn: now,
        lastUpdatedOn: now,
        concurrencyKey: `0x000000000000${(this.mockNextCycleId + 2000).toString(16).padStart(4, '0')}`,
      };
      this.mockPayCycles.push(cycle);
      return { payCycleId: cycle.id } as unknown as T;
    }
    if (svc === 'Payroll' && act === 'ClosePayCycle') {
      const id = Number(data.id);
      const idx = this.mockPayCycles.findIndex((c: any) => c.id === id);
      if (idx < 0) throw new Error('PayCycle not found');
      const existing = this.mockPayCycles[idx];
      const updated = {
        ...existing,
        status: 'CLOSED',
        lastUpdatedOn: new Date().toISOString(),
        concurrencyKey: `0x000000000000${(Date.now() % 65535).toString(16).padStart(4, '0')}`,
      };
      this.mockPayCycles[idx] = updated;
      return { closed: true, concurrencyKey: updated.concurrencyKey } as unknown as T;
    }
    if (svc === 'Payroll' && act === 'AddWorkLog') {
      const wl = {
        Id: this.mockNextWorkLogId++,
        PayCycleId: Number(data.payCycleId),
        EmployeeId: Number(data.employeeId),
        WorkDate: String(data.workDate),
        Hours: Number(data.hours),
        CreatedOn: new Date().toISOString(),
      };
      this.mockWorkLogs.push(wl);
      return { workLogId: wl.Id } as unknown as T;
    }
    if (svc === 'Payroll' && act === 'ProcessPayroll') {
      const payCycleId = Number(data.payCycleId);
      const cycle = this.mockPayCycles.find((c: any) => c.id === payCycleId);
      if (!cycle) throw new Error('PayCycle not found');
      if (cycle.status !== 'CLOSED') throw new Error('PayCycle must be CLOSED before processing');

      const existingPayments = this.mockPayments.filter((p: any) => p.PayCycleId === payCycleId);
      if (existingPayments.length) throw new Error('Payroll already processed for this cycle');

      const activeEmps = this.mockEmployees.filter((e: any) => e.isActive);
      const paymentsToInsert: any[] = [];

      for (const emp of activeEmps) {
        let gross = 0;
        if (emp.salaryType === 'MONTHLY') {
          gross = Number(emp.salaryAmount);
        } else {
          const totalHours = this.mockWorkLogs
            .filter((w: any) => w.PayCycleId === payCycleId && w.EmployeeId === emp.id)
            .reduce((sum: number, w: any) => sum + Number(w.Hours), 0);
          gross = totalHours * Number(emp.salaryAmount);
        }
        if (gross <= 0) continue;

        paymentsToInsert.push({
          Id: this.mockNextPaymentId++,
          PayCycleId: payCycleId,
          EmployeeId: emp.id,
          GrossAmount: gross,
          Currency: emp.currency ?? 'USD',
          PaidOn: new Date().toISOString(),
          Notes: 'Processed in-contract (record only)',
        });
      }

      if (!paymentsToInsert.length) throw new Error('No payable employees for this cycle');

      this.mockPayments.push(...paymentsToInsert);
      return { processed: true, paymentsCreated: paymentsToInsert.length } as unknown as T;
    }
    if (svc === 'Payroll' && act === 'GetPaymentsByCycle') {
      const payCycleId = Number(data.payCycleId);
      const rows = this.mockPayments.filter((p: any) => p.PayCycleId === payCycleId);
      return rows as unknown as T;
    }
    if (svc === 'Payroll' && act === 'GetPaymentsByEmployee') {
      const employeeId = Number(data.employeeId);
      const rows = this.mockPayments.filter((p: any) => p.EmployeeId === employeeId);
      return rows as unknown as T;
    }

    // --- Cluster ---
    if (svc === 'Cluster' && act === 'GetContractVersion') {
      return { version: 1 } as unknown as T;
    }
    if (svc === 'Cluster' && act === 'GetClusterUnl') {
      return { unl: ['ED25519_PUBKEY_1', 'ED25519_PUBKEY_2'] } as unknown as T;
    }
    if (svc === 'Cluster' && act === 'UpdateClusterConfig') {
      return { updated: true } as unknown as T;
    }
    if (svc === 'Cluster' && act === 'UpdateClusterDetails') {
      return { peers: ['example.com:8081'] } as unknown as T;
    }

    throw new Error(`[MOCK] Unhandled action: ${svc}.${act}`);
  }
}
