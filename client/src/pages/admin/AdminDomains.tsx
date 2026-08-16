import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminApi, AdminDkim } from '@/api/adminApi';

export function AdminDomains() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [selector, setSelector] = useState('wildduck');
  const [created, setCreated] = useState<AdminDkim | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-domains'],
    queryFn: async () => (await adminApi.listDomains()).data.data,
  });

  const addDomain = useMutation({
    mutationFn: () => adminApi.addDomain(domain.trim(), selector.trim() || 'wildduck'),
    onSuccess: ({ data: res }) => {
      setCreated(res.data);
      setOpen(false);
      setDomain('');
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      toast.success('DKIM created — add the DNS TXT record');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to add domain'),
  });

  const removeDkim = useMutation({
    mutationFn: (id: string) => adminApi.deleteDkim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      toast.success('DKIM key removed');
    },
  });

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Domains</h1>
            <p className="text-sm text-gray-500 mt-1">Addresses grouped by domain, with DKIM status</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>Add domain DKIM</Button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Mailboxes</th>
                  <th className="px-4 py-3">DKIM</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {(data ?? []).map((row) => (
                  <tr key={row.domain}>
                    <td className="px-4 py-3 font-medium">{row.domain}</td>
                    <td className="px-4 py-3 text-gray-500">{row.mailboxes}</td>
                    <td className="px-4 py-3">
                      {row.dkim ? (
                        <span className="text-xs font-semibold text-teal-700">{row.dkim.selector}</span>
                      ) : (
                        <span className="text-xs text-amber-600">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.dkim && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => row.dkim && removeDkim.mutate(row.dkim.id)}
                        >
                          Remove DKIM
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add domain DKIM">
        <form
          className="px-6 py-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); addDomain.mutate(); }}
        >
          <input
            required
            placeholder="repod.online"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <input
            placeholder="Selector (wildduck)"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={addDomain.isPending}>Generate DKIM</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(created)} onClose={() => setCreated(null)} title="DNS TXT record" size="lg">
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">Publish this TXT record, then wait for DNS to propagate.</p>
          <div className="text-xs font-mono bg-stone-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 space-y-2 break-all">
            <p><span className="text-gray-500">Name:</span> {created?.dnsTxt?.name}</p>
            <p><span className="text-gray-500">Value:</span> {created?.dnsTxt?.value}</p>
          </div>
          <Button size="sm" onClick={() => setCreated(null)}>Done</Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
