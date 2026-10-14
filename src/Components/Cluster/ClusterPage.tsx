import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Network, RefreshCw, Plus, Minus } from 'lucide-react';
import ApiService from '../../services/api-service';
import Loading from '../Shared/Loading';
import { showSnackbar } from '../../features/snackbar/snackbarSlice';

export default function ClusterPage() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [version, setVersion] = useState<number | string>('—');
  const [unl, setUnl] = useState<string[]>([]);

  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [publicKey, setPublicKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ver, unlRes] = await Promise.all([
        ApiService.getInstance().getContractVersion(),
        ApiService.getInstance().getClusterUnl(),
      ]);
      setVersion(ver?.version ?? '—');
      setUnl(unlRes?.unl ?? []);
    } catch (e) {
      dispatch(
        showSnackbar({
          message: e instanceof Error ? e.message : 'Failed to load cluster info',
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
      dispatch(showSnackbar({ message: 'Cluster info refreshed', severity: 'success' }));
    } catch {
      // load shows errors
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!publicKey.trim()) {
      dispatch(showSnackbar({ message: 'Public key is required', severity: 'error' }));
      return;
    }

    setSubmitting(true);
    try {
      await ApiService.getInstance().updateClusterConfig({ action, publicKey: publicKey.trim() });
      dispatch(showSnackbar({ message: 'Cluster config update submitted', severity: 'success' }));
      setPublicKey('');
      await refresh();
    } catch (err) {
      dispatch(
        showSnackbar({
          message: err instanceof Error ? err.message : 'Failed to update cluster config',
          severity: 'error',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text="Loading cluster..." />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cluster</h1>
            <p className="mt-1 text-sm text-gray-500">View cluster UNL and contract version (admin operations).</p>
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
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Contract Version</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{String(version)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">UNL Members</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{unl.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Network className="h-5 w-5 text-indigo-600" />
            Update UNL
          </h2>
          <p className="mt-1 text-sm text-gray-500">Adds or removes a node public key from the UNL.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Action</label>
              <select
                value={action}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAction(e.target.value as 'add' | 'remove')}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="add">add</option>
                <option value="remove">remove</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Public Key</label>
              <input
                value={publicKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublicKey(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="ED25519 pubkey..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Update'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Current UNL</h2>
            </div>
            {unl.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Network className="h-10 w-10 text-gray-400" />
                <p className="mt-4 text-sm font-semibold text-gray-800">No UNL entries</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {unl.map((k: string) => (
                  <li key={k} className="flex items-center justify-between gap-3 px-6 py-4">
                    <span className="truncate font-mono text-xs text-gray-700">{k}</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      <Plus className="h-3.5 w-3.5" />
                      UNL
                      <Minus className="h-3.5 w-3.5" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
