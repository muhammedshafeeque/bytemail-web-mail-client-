import { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Users, Globe, KeyRound, Shuffle } from 'lucide-react';
import { cn } from '@/utils/cn';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/domains', label: 'Domains', icon: Globe, end: false },
  { to: '/admin/dkim', label: 'DKIM', icon: KeyRound, end: false },
  { to: '/admin/aliases', label: 'Aliases', icon: Shuffle, end: false },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-zinc-950">
      <aside className="hidden md:flex flex-col w-56 border-r border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Mail
        </Link>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">Platform</p>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 flex-shrink-0 border-b border-stone-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between">
          <span className="font-bold text-lg text-brand-600">ByteMail</span>
          <span className="text-xs font-medium text-gray-500">Platform admin</span>
        </header>
        <div className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                isActive ? 'bg-brand-100 text-brand-700' : 'text-gray-600',
              )}
            >
              {label}
            </NavLink>
          ))}
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
