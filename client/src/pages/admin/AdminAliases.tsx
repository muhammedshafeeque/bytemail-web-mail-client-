import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminApi } from '@/api/adminApi';

export function AdminAliases() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const [domain, setDomain] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-aliases'],
    queryFn: async () => (await adminApi.listAliases()).data.data,
  });

  const createAlias = useMutation({
    mutationFn: () => adminApi.createAlias(alias.trim(), domain.trim()),
    onSuccess: () => {
      toast.success('Alias created');
      setOpen(false);
      setAlias('');
      setDomain('');
      queryClient.invalidateQueries({ queryKey: ['admin-aliases'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to create alias'),
  });

  const removeAlias = useMutation({
    mutationFn: (id: string) => adminApi.deleteAlias(id),
    onSuccess: () => {
      toast.success('Alias removed');
      queryClient.invalidateQueries({ queryKey: ['admin-aliases'] });
    },
  });

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Domain aliases</h1>
            <p className="text-sm text-gray-500 mt-1">
              Mail to user@alias is delivered as user@domain
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>Add alias</Button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No aliases yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Alias</th>
                  <th className="px-4 py-3">Delivers to</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {(data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">{row.alias}</td>
                    <td className="px-4 py-3 text-gray-500">{row.domain}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="danger" onClick={() => removeAlias.mutate(row.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add domain alias">
        <form className="px-6 py-4 space-y-3" onSubmit={(e) => { e.preventDefault(); createAlias.mutate(); }}>
          <input
            required
            placeholder="Alias domain, e.g. mail.repod.online"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <input
            required
            placeholder="Target domain, e.g. repod.online"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={createAlias.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
