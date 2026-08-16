import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminApi, AdminUser } from '@/api/adminApi';
import { cn } from '@/utils/cn';

function domainOf(address: string): string {
  const at = address.lastIndexOf('@');
  return at >= 0 ? address.slice(at + 1).toLowerCase() : '';
}

function formatQuota(user: AdminUser): string {
  const allowed = user.quota?.allowed ?? 0;
  const used = user.quota?.used ?? 0;
  if (!allowed) return `${Math.round(used / 1024 / 1024)} MB used`;
  return `${Math.round(used / 1024 / 1024)} / ${Math.round(allowed / 1024 / 1024)} MB`;
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    local: '',
    domain: '',
    username: '',
    password: '',
    name: '',
    quota_mb: '1024',
  });
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [quotaUser, setQuotaUser] = useState<AdminUser | null>(null);
  const [quotaMb, setQuotaMb] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, domain],
    queryFn: async () => (await adminApi.listUsers(search, 1, domain)).data,
  });

  const { data: domainsData } = useQuery({
    queryKey: ['admin-domains'],
    queryFn: async () => (await adminApi.listDomains()).data.data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const users = data?.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, AdminUser[]>();
    for (const user of users) {
      const key = domainOf(user.address) || '(no domain)';
      const list = map.get(key) ?? [];
      list.push(user);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [users]);

  const domainOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of domainsData ?? []) if (row.domain) set.add(row.domain.toLowerCase());
    for (const [name] of grouped) if (name && name !== '(no domain)') set.add(name);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [domainsData, grouped]);

  const visibleGroups = domain
    ? grouped.filter(([name]) => name === domain)
    : grouped;

  const createUser = useMutation({
    mutationFn: () => {
      const host = form.domain.trim() || domain || domainOptions[0] || '';
      const address = `${form.local.trim()}@${host}`.toLowerCase();
      return adminApi.createUser({
        username: form.username.trim() || undefined,
        address,
        password: form.password,
        name: form.name.trim() || undefined,
        quota_mb: Number(form.quota_mb) || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Mailbox created');
      setCreateOpen(false);
      setForm({ local: '', domain: domain || '', username: '', password: '', name: '', quota_mb: '1024' });
      refresh();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Create failed'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateUser>[1] }) =>
      adminApi.updateUser(id, body),
    onSuccess: () => { toast.success('Updated'); refresh(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Update failed'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { toast.success('Mailbox deleted'); refresh(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Delete failed'),
  });

  const setRole = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'admin' | 'user' }) => adminApi.setRole(email, role),
    onSuccess: () => { toast.success('Role updated'); refresh(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Role update failed'),
  });

  const setPassword = useMutation({
    mutationFn: () => adminApi.setPassword(passwordUser!.id, newPassword),
    onSuccess: () => {
      toast.success('Password set');
      setPasswordUser(null);
      setNewPassword('');
      setGeneratedPassword('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Password update failed'),
  });

  const resetPassword = useMutation({
    mutationFn: () => adminApi.resetPassword(passwordUser!.id),
    onSuccess: ({ data: res }) => {
      setGeneratedPassword(res.password);
      setNewPassword('');
      toast.success('Temporary password generated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Reset failed'),
  });

  const setQuota = useMutation({
    mutationFn: () => adminApi.updateUser(quotaUser!.id, { quota_mb: Number(quotaMb) }),
    onSuccess: () => {
      toast.success('Quota updated');
      setQuotaUser(null);
      refresh();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Quota update failed'),
  });

  const openCreate = (host?: string) => {
    setForm((f) => ({ ...f, domain: host || domain || domainOptions[0] || f.domain }));
    setCreateOpen(true);
  };

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Users</h1>
            <p className="text-sm text-gray-500 mt-1">Mailboxes grouped by domain</p>
          </div>
          <Button size="sm" onClick={() => openCreate()} disabled={!domainOptions.length && !domain}>
            Create mailbox
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDomain('')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              !domain
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-zinc-800',
            )}
          >
            All domains
          </button>
          {domainOptions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setDomain(name)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                domain === name
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-zinc-800',
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); setSearch(query.trim()); }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={domain ? `Search in ${domain}` : 'Search username or address'}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <Button type="submit" size="sm" variant="secondary">Search</Button>
        </form>

        {isLoading ? (
          <p className="p-6 text-sm text-gray-500 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
            Loading…
          </p>
        ) : visibleGroups.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
            No mailboxes{domain ? ` on ${domain}` : ''}.
          </p>
        ) : (
          visibleGroups.map(([name, rows]) => (
            <div key={name} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</p>
                  <p className="text-xs text-gray-500">{rows.length} mailbox{rows.length === 1 ? '' : 'es'}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setDomain(name); openCreate(name); }}
                >
                  Add to {name}
                </Button>
              </div>
              <UserTable
                users={rows}
                onDisable={(user) => updateUser.mutate({ id: user.id, body: { disabled: !user.disabled } })}
                onPassword={(user) => { setPasswordUser(user); setNewPassword(''); setGeneratedPassword(''); }}
                onQuota={(user) => {
                  setQuotaUser(user);
                  setQuotaMb(String(Math.round((user.quota?.allowed ?? 0) / 1024 / 1024) || 1024));
                }}
                onRole={(user) => setRole.mutate({
                  email: user.address,
                  role: user.role === 'admin' ? 'user' : 'admin',
                })}
                onDelete={(user) => {
                  if (window.confirm(`Delete mailbox ${user.address}?`)) deleteUser.mutate(user.id);
                }}
              />
            </div>
          ))
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create mailbox">
        <form
          className="px-6 py-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }}
        >
          <div className="flex gap-2">
            <input
              required
              placeholder="local part"
              value={form.local}
              onChange={(e) => setForm((f) => ({ ...f, local: e.target.value.replace(/@/g, '') }))}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
            />
            <span className="self-center text-gray-400">@</span>
            <select
              required
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
            >
              <option value="">Select domain</option>
              {domainOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <input
            placeholder="Username (optional)"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <input
            placeholder="Display name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <input
            required
            type="password"
            placeholder="Password (min 8)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <input
            type="number"
            min={0}
            placeholder="Quota MB"
            value={form.quota_mb}
            onChange={(e) => setForm((f) => ({ ...f, quota_mb: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={createUser.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(passwordUser)} onClose={() => setPasswordUser(null)} title="Set password">
        <form
          className="px-6 py-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); setPassword.mutate(); }}
        >
          <p className="text-sm text-gray-500">{passwordUser?.address}</p>
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          {generatedPassword && (
            <p className="text-xs font-mono break-all bg-stone-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
              Temporary password: {generatedPassword}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPasswordUser(null)}>Cancel</Button>
            <Button type="button" variant="outline" size="sm" loading={resetPassword.isPending} onClick={() => resetPassword.mutate()}>
              Generate
            </Button>
            <Button type="submit" size="sm" loading={setPassword.isPending} disabled={newPassword.length < 8}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(quotaUser)} onClose={() => setQuotaUser(null)} title="Set quota">
        <form
          className="px-6 py-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); setQuota.mutate(); }}
        >
          <p className="text-sm text-gray-500">{quotaUser?.address}</p>
          <input
            type="number"
            min={0}
            required
            value={quotaMb}
            onChange={(e) => setQuotaMb(e.target.value)}
            placeholder="Quota in MB"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setQuotaUser(null)}>Cancel</Button>
            <Button type="submit" size="sm" loading={setQuota.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

function UserTable({
  users,
  onDisable,
  onPassword,
  onQuota,
  onRole,
  onDelete,
}: {
  users: AdminUser[];
  onDisable: (user: AdminUser) => void;
  onPassword: (user: AdminUser) => void;
  onQuota: (user: AdminUser) => void;
  onRole: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-zinc-800">
        <tr>
          <th className="px-4 py-3">Mailbox</th>
          <th className="px-4 py-3">Quota</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Role</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
        {users.map((user) => (
          <tr key={user.id}>
            <td className="px-4 py-3">
              <p className="font-medium text-gray-900 dark:text-gray-100">{user.name || user.username}</p>
              <p className="text-xs text-gray-500">{user.address}</p>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatQuota(user)}</td>
            <td className="px-4 py-3">
              {user.disabled ? (
                <span className="text-xs font-semibold text-red-600">Disabled</span>
              ) : user.suspended ? (
                <span className="text-xs font-semibold text-amber-600">Suspended</span>
              ) : (
                <span className="text-xs font-semibold text-teal-700">Active</span>
              )}
            </td>
            <td className="px-4 py-3">
              {user.env_admin || user.role === 'admin' ? (
                <span className="text-xs font-semibold text-brand-700">Admin{user.env_admin ? ' (env)' : ''}</span>
              ) : (
                <span className="text-xs text-gray-500">User</span>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => onDisable(user)}>
                  {user.disabled ? 'Enable' : 'Disable'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPassword(user)}>Password</Button>
                <Button size="sm" variant="outline" onClick={() => onQuota(user)}>Quota</Button>
                {!user.env_admin && (
                  <Button size="sm" variant="outline" onClick={() => onRole(user)}>
                    {user.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => onDelete(user)}>Delete</Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
