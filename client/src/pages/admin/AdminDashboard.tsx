import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminApi } from '@/api/adminApi';
import { Users, Ban, Globe, KeyRound, Shuffle, Mail } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await adminApi.dashboard()).data.data,
  });

  const cards = data
    ? [
        { label: 'Mailboxes', value: data.users, icon: Users },
        { label: 'Disabled', value: data.disabled, icon: Ban },
        { label: 'Domains', value: data.domains, icon: Globe },
        { label: 'DKIM keys', value: data.dkim, icon: KeyRound },
        { label: 'Aliases', value: data.aliases, icon: Shuffle },
        { label: 'Messages', value: data.messages, icon: Mail },
      ]
    : [];

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">WildDuck mail platform overview</p>
        </div>
        {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-500">Could not load dashboard.</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                    <Icon className="h-4 w-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mt-2">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Quota</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatBytes(data.quota.used)} used of {formatBytes(data.quota.allowed)} allowed
              </p>
              <div className="h-2 rounded-full bg-stone-100 dark:bg-zinc-800 mt-3 overflow-hidden">
                <div
                  className="h-full bg-brand-600"
                  style={{
                    width: `${data.quota.allowed ? Math.min(100, (data.quota.used / data.quota.allowed) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-800">
                <p className="text-sm font-semibold">Recent mailboxes</p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                {data.recent.map((user) => (
                  <li key={user.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{user.name || user.address}</p>
                      <p className="text-xs text-gray-500">{user.address}</p>
                    </div>
                    {user.disabled && <span className="text-[10px] uppercase font-semibold text-red-600">Disabled</span>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
