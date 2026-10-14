import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Plus, UserX, Pencil, RefreshCw, Users } from 'lucide-react';
import ApiService from '../../services/api-service';
import Loading from '../Shared/Loading';
import { showSnackbar } from '../../features/snackbar/snackbarSlice';
import type { AddEmployeeInput, Employee, SalaryType, UpdateEmployeeInput } from '../../types';

type ModalMode = 'create' | 'edit';

const defaultCreate: AddEmployeeInput = {
  name: '',
  salaryType: 'MONTHLY',
  salaryAmount: 3000,
  currency: 'USD',
};

export default function EmployeesPage() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState<AddEmployeeInput>(defaultCreate);

  const [editForm, setEditForm] = useState<UpdateEmployeeInput | null>(null);

  const activeCount = useMemo(() => employees.filter((e: Employee) => e.isActive).length, [employees]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await ApiService.getInstance().getAllEmployees();
      setEmployees(list ?? []);
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to load employees',
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
      const list = await ApiService.getInstance().getAllEmployees();
      setEmployees(list ?? []);
      dispatch(showSnackbar({ message: 'Employees refreshed', severity: 'success' }));
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to refresh employees',
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

  const openCreate = () => {
    setModalMode('create');
    setCreateForm(defaultCreate);
    setEditForm(null);
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setModalMode('edit');
    setEditForm({
      id: emp.id,
      concurrencyKey: emp.concurrencyKey,
      name: emp.name,
      salaryType: emp.salaryType,
      salaryAmount: emp.salaryAmount,
      currency: emp.currency,
      isActive: emp.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const submitCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!createForm.name.trim()) {
      dispatch(showSnackbar({ message: 'Name is required', severity: 'error' }));
      return;
    }

    setCreating(true);
    try {
      await ApiService.getInstance().addEmployee({
        name: createForm.name.trim(),
        salaryType: createForm.salaryType,
        salaryAmount: Number(createForm.salaryAmount),
        currency: (createForm.currency ?? 'USD').toUpperCase(),
      });

      dispatch(showSnackbar({ message: 'Employee added', severity: 'success' }));
      closeModal();
      await refresh();
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to add employee',
          severity: 'error',
        }),
      );
    } finally {
      setCreating(false);
    }
  };

  const submitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editForm) return;

    if (editForm.name !== undefined && !String(editForm.name).trim()) {
      dispatch(showSnackbar({ message: 'Name cannot be empty', severity: 'error' }));
      return;
    }

    setCreating(true);
    try {
      const result = await ApiService.getInstance().updateEmployee({
        ...editForm,
        name: editForm.name !== undefined ? String(editForm.name).trim() : undefined,
        currency: editForm.currency !== undefined ? String(editForm.currency).toUpperCase() : undefined,
        salaryAmount: editForm.salaryAmount !== undefined ? Number(editForm.salaryAmount) : undefined,
      });

      dispatch(showSnackbar({ message: 'Employee updated', severity: 'success' }));
      // Update local concurrency key in state by reloading.
      closeModal();
      await refresh();

      // (result.concurrencyKey is returned by backend; refresh already captures it)
      void result;
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to update employee',
          severity: 'error',
        }),
      );
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async (emp: Employee) => {
    if (!emp.isActive) return;

    const ok = window.confirm(`Deactivate ${emp.name}? (This sets IsActive=0 in the contract.)`);
    if (!ok) return;

    try {
      await ApiService.getInstance().removeEmployee({ id: emp.id, concurrencyKey: emp.concurrencyKey });
      dispatch(showSnackbar({ message: 'Employee deactivated', severity: 'success' }));
      await refresh();
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to deactivate employee',
          severity: 'error',
        }),
      );
    }
  };

  if (loading) return <Loading text="Loading employees..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">Add, edit, and deactivate employees (admin-only writes).</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{employees.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Active</p>
          <p className="mt-1 text-3xl font-bold text-emerald-800">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Inactive</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{employees.length - activeCount}</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20">
          <Users className="h-10 w-10 text-gray-400" />
          <p className="mt-4 text-lg font-semibold text-gray-800">No employees yet</p>
          <p className="mt-1 text-sm text-gray-500">Add your first employee to begin payroll operations.</p>
          <button
            onClick={openCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Salary
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
              {employees.map((emp: Employee) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{emp.name}</div>
                    <div className="text-xs text-gray-500">ID: {emp.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {emp.salaryType === 'HOURLY'
                        ? `${emp.salaryAmount} ${emp.currency}/hr`
                        : `${emp.salaryAmount} ${emp.currency}/mo`}
                    </div>
                    <div className="text-xs font-mono text-gray-500">{emp.salaryType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        emp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(emp)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => deactivate(emp)}
                        disabled={!emp.isActive}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <UserX className="h-4 w-4" />
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Add Employee' : 'Edit Employee'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Updates require the latest <span className="font-mono">concurrencyKey</span>.
              </p>
            </div>

            {modalMode === 'create' ? (
              <form onSubmit={submitCreate} className="space-y-4 p-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                  <input
                    value={createForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g., Jordan Smith"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Salary Type</label>
                    <select
                      value={createForm.salaryType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setCreateForm({ ...createForm, salaryType: e.target.value as SalaryType })
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="HOURLY">HOURLY</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Salary Amount</label>
                    <input
                      type="number"
                      value={createForm.salaryAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm({ ...createForm, salaryAmount: Number(e.target.value) })
                      }
                      min={0}
                      step="0.01"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
                  <input
                    value={createForm.currency ?? 'USD'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm({ ...createForm, currency: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="USD"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {creating ? 'Saving...' : 'Add Employee'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitEdit} className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Employee ID</label>
                    <input
                      value={String(editForm?.id ?? '')}
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Concurrency Key</label>
                    <input
                      value={String(editForm?.concurrencyKey ?? '')}
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-xs text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                  <input
                    value={String(editForm?.name ?? '')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm((prev: UpdateEmployeeInput | null) =>
                        prev
                          ? {
                              ...prev,
                              name: e.target.value,
                            }
                          : prev,
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Salary Type</label>
                    <select
                      value={String(editForm?.salaryType ?? 'MONTHLY')}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setEditForm((prev: UpdateEmployeeInput | null) =>
                          prev
                            ? {
                                ...prev,
                                salaryType: e.target.value as SalaryType,
                              }
                            : prev,
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="HOURLY">HOURLY</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Salary Amount</label>
                    <input
                      type="number"
                      value={Number(editForm?.salaryAmount ?? 0)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm((prev: UpdateEmployeeInput | null) =>
                          prev
                            ? {
                                ...prev,
                                salaryAmount: Number(e.target.value),
                              }
                            : prev,
                        )
                      }
                      min={0}
                      step="0.01"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
                    <input
                      value={String(editForm?.currency ?? 'USD')}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm((prev: UpdateEmployeeInput | null) =>
                          prev
                            ? {
                                ...prev,
                                currency: e.target.value,
                              }
                            : prev,
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Active</label>
                    <select
                      value={String(Boolean(editForm?.isActive ?? true))}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setEditForm((prev: UpdateEmployeeInput | null) =>
                          prev
                            ? {
                                ...prev,
                                isActive: e.target.value === 'true',
                              }
                            : prev,
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {creating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
