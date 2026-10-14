import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, Wallet, ArrowRight, ShieldAlert } from 'lucide-react';
import ApiService from '../services/api-service';
import Loading from '../Components/Shared/Loading';
import { showSnackbar } from '../features/snackbar/snackbarSlice';
import type { Employee, PayCycle, PaymentRow } from '../types';

export default function DashboardHome() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cycles, setCycles] = useState<PayCycle[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);

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

      // Load recent payments from the most recent CLOSED cycle (if any).
      const latestClosed = (payCycles ?? [])
        .filter((c: PayCycle) => c.status === 'CLOSED')
        .sort((a: PayCycle, b: PayCycle) => (a.endDate < b.endDate ? 1 : -1))[0];

      if (latestClosed?.id) {
        const payments = await ApiService.getInstance().getPaymentsByCycle({ payCycleId: latestClosed.id });
        const sorted = (payments ?? []).slice().sort((a: PaymentRow, b: PaymentRow) => (a.PaidOn < b.PaidOn ? 1 : -1));
        setRecentPayments(sorted.slice(0, 5));
      } else {
        setRecentPayments([]);
      }
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to load dashboard data',
          severity: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loading text="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payroll operations at a glance</h1>
            <p className="mt-2 text-sm text-white/80">Manage employees, pay cycles, work logs, and payment history.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/employees"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <Users className="h-4 w-4" />
              Manage Employees
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/payroll"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <CalendarDays className="h-4 w-4" />
              Pay Cycles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Active Employees</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{activeEmployees.length}</p>
          <p className="mt-2 text-xs text-gray-500">Total employees: {employees.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Open Cycle</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {openCycle ? `${openCycle.startDate} → ${openCycle.endDate}` : 'None'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {openCycle ? 'Work logs can be added while cycle is OPEN.' : 'Create a cycle to begin tracking time.'}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Admin authorization</p>
              <p className="mt-1 text-xs text-amber-800">
                If writes fail with “Unauthorized”, set the contract’s{' '}
                <span className="font-mono">MAINTAINER_PUBKEY</span> to match your browser client pubkey.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent payments</h2>
          <Link to="/payments" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12">
            <Wallet className="h-8 w-8 text-gray-400" />
            <p className="mt-3 text-sm font-semibold text-gray-800">No payments to show</p>
            <p className="mt-1 text-xs text-gray-500">Process payroll for a closed cycle to generate payment records.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cycle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    EmployeeId
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Gross</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paid On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recentPayments.map((p: PaymentRow) => (
                  <tr key={p.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">#{p.PayCycleId}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">{p.EmployeeId}</td>
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
    </div>
  );
}
