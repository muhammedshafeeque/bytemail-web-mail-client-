import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminApi, type AdminDkim as DkimKey } from '@/api/adminApi';

export function AdminDkim() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [selector, setSelector] = useState('wildduck');
  const [detail, setDetail] = useState<DkimKey | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dkim'],
    queryFn: async () => (await adminApi.listDkim()).data.data,
  });

  const createKey = useMutation({
    mutationFn: () => adminApi.createDkim({ domain: domain.trim(), selector: selector.trim() || 'wildduck' }),
    onSuccess: ({ data: res }) => {
      setDetail(res.data);
      setOpen(false);
      setDomain('');
      queryClient.invalidateQueries({ queryKey: ['admin-dkim'] });
      toast.success('DKIM key created');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to create key'),
  });

  const removeKey = useMutation({
    mutationFn: (id: string) => adminApi.deleteDkim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dkim'] });
      toast.success('Key deleted');
    },
  });

  const loadDetail = async (id: string) => {
    const { data: res } = await adminApi.getDkim(id);
    setDetail(res.data);
  };

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">DKIM</h1>
            <p className="text-sm text-gray-500 mt-1">Signing keys and DNS TXT values</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>Add key</Button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Selector</th>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {(data ?? []).map((key) => (
                  <tr key={key.id}>
                    <td className="px-4 py-3 font-medium">{key.domain}</td>
                    <td className="px-4 py-3">{key.selector}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-xs">{key.fingerprint}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => loadDetail(key.id)}>DNS</Button>
                      <Button size="sm" variant="danger" onClick={() => removeKey.mutate(key.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add DKIM key">
        <form className="px-6 py-4 space-y-3" onSubmit={(e) => { e.preventDefault(); createKey.mutate(); }}>
          <input
            required
            placeholder="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <input
            placeholder="Selector"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={createKey.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="DKIM DNS" size="lg">
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm font-medium">{detail?.domain} · {detail?.selector}</p>
          <div className="text-xs font-mono bg-stone-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 space-y-2 break-all">
            <p><span className="text-gray-500">Name:</span> {detail?.dnsTxt?.name}</p>
            <p><span className="text-gray-500">Value:</span> {detail?.dnsTxt?.value}</p>
          </div>
          <Button size="sm" onClick={() => setDetail(null)}>Close</Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
