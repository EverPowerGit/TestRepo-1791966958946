import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { RefreshCw, Wallet, Search } from 'lucide-react';
import ApiService from '../../services/api-service';
import Loading from '../Shared/Loading';
import { showSnackbar } from '../../features/snackbar/snackbarSlice';
import type { Employee, PayCycle, PaymentRow } from '../../types';

type Mode = 'cycle' | 'employee';

export default function PaymentsPage() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cycles, setCycles] = useState<PayCycle[]>([]);

  const [mode, setMode] = useState<Mode>('cycle');
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [querying, setQuerying] = useState(false);

  const employeeNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const cycleLabelById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cycles) m.set(c.id, `${c.startDate}→${c.endDate} (${c.status})`);
    return m;
  }, [cycles]);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, payCycles] = await Promise.all([
        ApiService.getInstance().getAllEmployees(),
        ApiService.getInstance().listPayCycles(),
      ]);
      setEmployees(emps ?? []);
      setCycles(payCycles ?? []);

      const closed = (payCycles ?? []).filter((c: PayCycle) => c.status === 'CLOSED');
      const latestClosed = closed.sort((a: PayCycle, b: PayCycle) => (a.endDate < b.endDate ? 1 : -1))[0];
      if (latestClosed?.id) setSelectedCycleId(latestClosed.id);
      if ((emps ?? [])[0]?.id) setSelectedEmployeeId((emps ?? [])[0].id);

      setPayments([]);
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to load payments page',
          severity: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
      dispatch(showSnackbar({ message: 'Data refreshed', severity: 'success' }));
    } catch {
      // load already handles snackbar
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runQuery = async () => {
    setQuerying(true);
    try {
      if (mode === 'cycle') {
        if (!selectedCycleId) {
          dispatch(showSnackbar({ message: 'Select a cycle first', severity: 'error' }));
          return;
        }
        const rows = await ApiService.getInstance().getPaymentsByCycle({ payCycleId: selectedCycleId });
        setPayments(rows ?? []);
      } else {
        if (!selectedEmployeeId) {
          dispatch(showSnackbar({ message: 'Select an employee first', severity: 'error' }));
          return;
        }
        const rows = await ApiService.getInstance().getPaymentsByEmployee({ employeeId: selectedEmployeeId });
        setPayments(rows ?? []);
      }
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to query payments',
          severity: 'error',
        }),
      );
    } finally {
      setQuerying(false);
    }
  };

  const totalGross = useMemo(
    () => payments.reduce((sum: number, p: PaymentRow) => sum + Number(p.GrossAmount), 0),
    [payments],
  );

  if (loading) return <Loading text="Loading payments..." />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
            <p className="mt-1 text-sm text-gray-500">Payments are records created by ProcessPayroll.</p>
          </div>

          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Records</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{payments.length}</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Total Gross</p>
          <p className="mt-1 text-3xl font-bold text-indigo-900">{totalGross}</p>
          <p className="mt-1 text-xs text-indigo-700">Mixed currencies are possible; total is raw sum.</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Query Mode</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{mode === 'cycle' ? 'By cycle' : 'By employee'}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMode('cycle')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === 'cycle' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              By Cycle
            </button>
            <button
              onClick={() => setMode('employee')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === 'employee' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              By Employee
            </button>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-end">
            {mode === 'cycle' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cycle</label>
                <select
                  value={String(selectedCycleId)}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCycleId(Number(e.target.value))}
                  className="min-w-[320px] rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value={0}>Select a cycle...</option>
                  {cycles
                    .slice()
                    .sort((a: PayCycle, b: PayCycle) => (a.startDate < b.startDate ? 1 : -1))
                    .map((c: PayCycle) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} — {c.startDate}→{c.endDate} ({c.status})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Employee</label>
                <select
                  value={String(selectedEmployeeId)}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedEmployeeId(Number(e.target.value))}
                  className="min-w-[320px] rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value={0}>Select an employee...</option>
                  {employees
                    .slice()
                    .sort((a: Employee, b: Employee) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))
                    .map((e: Employee) => (
                      <option key={e.id} value={e.id}>
                        #{e.id} — {e.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <button
              onClick={runQuery}
              disabled={querying}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {querying ? 'Querying...' : 'Query'}
            </button>
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20">
          <Wallet className="h-10 w-10 text-gray-400" />
          <p className="mt-4 text-lg font-semibold text-gray-800">No payments found</p>
          <p className="mt-1 text-sm text-gray-500">Run a query above, or process payroll for a closed cycle.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{payments.length}</span> records
            </p>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Cycle
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Gross
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Paid On
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {payments
                .slice()
                .sort((a: PaymentRow, b: PaymentRow) => (a.PaidOn < b.PaidOn ? 1 : -1))
                .map((p: PaymentRow) => (
                  <tr key={p.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">#{p.Id}</div>
                      <div className="text-xs text-gray-500">{p.Notes}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      #{p.PayCycleId}
                      <div className="text-xs text-gray-500">{cycleLabelById.get(p.PayCycleId) ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      #{p.EmployeeId}
                      <div className="text-xs text-gray-500">{employeeNameById.get(p.EmployeeId) ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {p.GrossAmount} {p.Currency}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.PaidOn}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
