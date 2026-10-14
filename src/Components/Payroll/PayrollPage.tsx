import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Play,
  Lock,
  ClipboardList,
} from 'lucide-react';
import ApiService from '../../services/api-service';
import Loading from '../Shared/Loading';
import { showSnackbar } from '../../features/snackbar/snackbarSlice';
import type { AddWorkLogInput, Employee, PayCycle } from '../../types';

type Tab = 'cycles' | 'worklogs';

export default function PayrollPage() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('cycles');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cycles, setCycles] = useState<PayCycle[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  // Create cycle form
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-15');

  // Work log form
  const [addingLog, setAddingLog] = useState(false);
  const [logPayCycleId, setLogPayCycleId] = useState<number>(0);
  const [logEmployeeId, setLogEmployeeId] = useState<number>(0);
  const [logWorkDate, setLogWorkDate] = useState('2026-01-03');
  const [logHours, setLogHours] = useState<number>(8);

  const openCycle = useMemo(() => cycles.find((c: PayCycle) => c.status === 'OPEN') ?? null, [cycles]);
  const activeEmployees = useMemo(() => employees.filter((e: Employee) => e.isActive), [employees]);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, payCycles] = await Promise.all([
        ApiService.getInstance().getAllEmployees(),
        ApiService.getInstance().listPayCycles(),
      ]);

      setEmployees(emps ?? []);
      setCycles(payCycles ?? []);

      const open = (payCycles ?? []).find((c: PayCycle) => c.status === 'OPEN');
      if (open?.id) {
        setLogPayCycleId(open.id);
      } else if ((payCycles ?? [])[0]?.id) {
        setLogPayCycleId((payCycles ?? [])[0].id);
      }

      if ((emps ?? [])[0]?.id) setLogEmployeeId((emps ?? [])[0].id);
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to load payroll data',
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
      const [emps, payCycles] = await Promise.all([
        ApiService.getInstance().getAllEmployees(),
        ApiService.getInstance().listPayCycles(),
      ]);
      setEmployees(emps ?? []);
      setCycles(payCycles ?? []);
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to refresh payroll data',
          severity: 'error',
        }),
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCycle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setCreatingCycle(true);
    try {
      await ApiService.getInstance().createPayCycle({ startDate, endDate });
      dispatch(showSnackbar({ message: 'Pay cycle created', severity: 'success' }));
      await refresh();
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to create pay cycle',
          severity: 'error',
        }),
      );
    } finally {
      setCreatingCycle(false);
    }
  };

  const handleCloseCycle = async (cycle: PayCycle) => {
    const ok = window.confirm(`Close pay cycle #${cycle.id}? This requires concurrencyKey.`);
    if (!ok) return;

    try {
      // For safety, fetch latest concurrencyKey.
      const fresh = await ApiService.getInstance().getPayCycleById({ id: cycle.id });
      await ApiService.getInstance().closePayCycle({ id: cycle.id, concurrencyKey: fresh.concurrencyKey });
      dispatch(showSnackbar({ message: 'Pay cycle closed', severity: 'success' }));
      await refresh();
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to close pay cycle',
          severity: 'error',
        }),
      );
    }
  };

  const handleProcessPayroll = async (cycle: PayCycle) => {
    const ok = window.confirm(
      `Process payroll for cycle #${cycle.id}? This writes payment records and cannot be repeated for the same cycle.`,
    );
    if (!ok) return;

    try {
      const res = await ApiService.getInstance().processPayroll({ payCycleId: cycle.id });
      dispatch(
        showSnackbar({
          message: `Payroll processed. Payments created: ${res.paymentsCreated}`,
          severity: 'success',
        }),
      );
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to process payroll',
          severity: 'error',
        }),
      );
    }
  };

  const handleAddWorkLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const input: AddWorkLogInput = {
      payCycleId: Number(logPayCycleId),
      employeeId: Number(logEmployeeId),
      workDate: String(logWorkDate),
      hours: Number(logHours),
    };

    setAddingLog(true);
    try {
      await ApiService.getInstance().addWorkLog(input);
      dispatch(showSnackbar({ message: 'Work log added', severity: 'success' }));
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to add work log',
          severity: 'error',
        }),
      );
    } finally {
      setAddingLog(false);
    }
  };

  if (loading) return <Loading text="Loading payroll..." />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pay Cycles & Payroll</h1>
            <p className="mt-1 text-sm text-gray-500">Create cycles, add work logs, close cycles, and run payroll.</p>
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

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setTab('cycles')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'cycles' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pay Cycles
          </button>
          <button
            onClick={() => setTab('worklogs')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'worklogs' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Work Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Cycles</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{cycles.length}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Open Cycle</p>
          <p className="mt-1 text-lg font-semibold text-sky-900">{openCycle ? `#${openCycle.id}` : 'None'}</p>
          <p className="mt-1 text-xs text-sky-700">{openCycle ? `${openCycle.startDate} → ${openCycle.endDate}` : ''}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Active Employees</p>
          <p className="mt-1 text-3xl font-bold text-emerald-800">{activeEmployees.length}</p>
        </div>
      </div>

      {tab === 'cycles' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Plus className="h-5 w-5 text-indigo-600" />
              Create Pay Cycle
            </h2>
            <p className="mt-1 text-sm text-gray-500">Dates must be YYYY-MM-DD and endDate ≥ startDate.</p>

            <form onSubmit={handleCreateCycle} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={creatingCycle}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {creatingCycle ? 'Creating...' : 'Create Cycle'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CalendarDays className="h-5 w-5 text-indigo-600" />
                  Pay Cycles
                </h2>
              </div>

              {cycles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CalendarDays className="h-10 w-10 text-gray-400" />
                  <p className="mt-4 text-sm font-semibold text-gray-800">No cycles yet</p>
                  <p className="mt-1 text-xs text-gray-500">Create a pay cycle to begin.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Cycle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Dates
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {cycles
                      .slice()
                      .sort((a: PayCycle, b: PayCycle) => (a.startDate < b.startDate ? 1 : -1))
                      .map((c: PayCycle) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">#{c.id}</div>
                            <div className="text-xs font-mono text-gray-500">{c.concurrencyKey}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {c.startDate} → {c.endDate}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                c.status === 'OPEN' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {c.status === 'OPEN' ? (
                                <Clock className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleCloseCycle(c)}
                                disabled={c.status !== 'OPEN'}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                              >
                                <Lock className="h-4 w-4" />
                                Close
                              </button>
                              <button
                                onClick={() => handleProcessPayroll(c)}
                                disabled={c.status !== 'CLOSED'}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                <Play className="h-4 w-4" />
                                Process
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              Add Work Log
            </h2>
            <p className="mt-1 text-sm text-gray-500">Only valid for an OPEN cycle and active employee.</p>

            <form onSubmit={handleAddWorkLog} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Pay Cycle</label>
                <select
                  value={String(logPayCycleId)}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLogPayCycleId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {(cycles ?? []).map((c: PayCycle) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} ({c.status}) {c.startDate}→{c.endDate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Employee</label>
                <select
                  value={String(logEmployeeId)}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLogEmployeeId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {(activeEmployees ?? []).map((e: Employee) => (
                    <option key={e.id} value={e.id}>
                      #{e.id} — {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Work Date</label>
                  <input
                    type="date"
                    value={logWorkDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogWorkDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hours</label>
                  <input
                    type="number"
                    value={Number(logHours)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogHours(Number(e.target.value))}
                    min={0}
                    step="0.25"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingLog || activeEmployees.length === 0 || cycles.length === 0}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingLog ? 'Submitting...' : 'Add Work Log'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-amber-900">Tip</p>
              <p className="mt-1 text-sm text-amber-800">
                Work logs are stored in the contract and used only for HOURLY employees during{' '}
                <span className="font-semibold">ProcessPayroll</span>. Monthly employees are paid their fixed amount.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Workflow</h3>
              <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-600">
                <li>Create a pay cycle (OPEN).</li>
                <li>Add work logs for hourly employees within the cycle’s date range.</li>
                <li>Close the cycle (CLOSED).</li>
                <li>Process payroll (creates payment records once per cycle).</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
