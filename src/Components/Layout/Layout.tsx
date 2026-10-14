import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Users, CalendarDays, Wallet, Network, LayoutDashboard } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import ContractService from '../../services/contract-service';

function NavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        twMerge(
          'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const location = useLocation();
  const pubKey = ContractService.getInstance().getPublicKeyHex();

  const titleByPath: Record<string, string> = {
    '/': 'Dashboard',
    '/employees': 'Employees',
    '/payroll': 'Pay Cycles & Payroll',
    '/payments': 'Payment History',
    '/cluster': 'Cluster',
  };

  const pageTitle = titleByPath[location.pathname] ?? 'PayPilot Dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                PP
              </span>
              PayPilot Dashboard
            </Link>
            <span className="hidden text-sm text-gray-400 md:inline">/</span>
            <span className="hidden text-sm font-medium text-gray-700 md:inline">{pageTitle}</span>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <NavItem to="/" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
            <NavItem to="/employees" label="Employees" icon={<Users className="h-4 w-4" />} />
            <NavItem to="/payroll" label="Payroll" icon={<CalendarDays className="h-4 w-4" />} />
            <NavItem to="/payments" label="Payments" icon={<Wallet className="h-4 w-4" />} />
            <NavItem to="/cluster" label="Cluster" icon={<Network className="h-4 w-4" />} />
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-gray-500">
              Admin-only actions require the contract <span className="font-mono">MAINTAINER_PUBKEY</span> to match
              this browser client.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Client pubkey:</span>
              <span className="max-w-[420px] truncate rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700">
                {pubKey ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-gray-100 py-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} PayPilot Dashboard. All rights reserved.
      </footer>
    </div>
  );
}
