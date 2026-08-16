import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { apiKeyApi, ApiKeyRecord } from '@/api/apiKeyApi';
import { formatRelative } from '@/utils/formatDate';

function sendExample(key = 'bm_YOUR_KEY'): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bytemail.repod.online';
  return `curl -X POST ${origin}/api/v1/mail/send \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"someone@example.com","subject":"Hello","text":"Sent via API"}'`;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function ApiKeysPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await apiKeyApi.list();
      return data.data;
    },
  });

  const createKey = useMutation({
    mutationFn: (keyName: string) => apiKeyApi.create(keyName),
    onSuccess: ({ data }) => {
      setCreatedKey(data.data.key);
      setName('');
      setCopied(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key created');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create API key');
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => apiKeyApi.revoke(id),
    onSuccess: () => {
      setRevokeId(null);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to revoke API key');
    },
  });

  const handleCopyKey = async () => {
    if (!createdKey) return;
    const ok = await copyText(createdKey);
    if (ok) {
      setCopied(true);
      toast.success('Copied to clipboard');
    } else {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">API keys</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Let other software send mail as you through ByteMail. Keys identify your account; From is always your address.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Create a key</h3>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              toast.error('Give this key a name');
              return;
            }
            createKey.mutate(trimmed);
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. CRM or Invoice bot"
            maxLength={80}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button type="submit" size="sm" loading={createKey.isPending}>
            Generate key
          </Button>
        </form>
        <p className="text-xs text-gray-500">The full secret is shown only once. Store it in your app, then revoke it here if it leaks.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Active keys</h3>
        </div>
        {isLoading ? (
          <p className="px-6 py-8 text-sm text-gray-500">Loading keys…</p>
        ) : keys.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <KeyRound className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No API keys yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {keys.map((key) => (
              <ApiKeyRow key={key.id} record={key} onRevoke={() => setRevokeId(key.id)} />
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Example request</h3>
        <p className="text-xs text-gray-500">
          POST /api/v1/mail/send with the <span className="font-mono">X-API-Key</span> header. Mail is sent as your ByteMail address through WildDuck.
        </p>
        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-stone-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4 overflow-x-auto whitespace-pre-wrap">
          {sendExample()}
        </pre>
      </div>

      <Modal
        open={Boolean(createdKey)}
        onClose={() => setCreatedKey(null)}
        title="Copy your API key"
      >
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This secret will not be shown again. Copy it now and store it in your integration.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={createdKey ?? ''}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <Button size="sm" variant="secondary" onClick={handleCopyKey}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <Button size="sm" onClick={() => setCreatedKey(null)}>Done</Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(revokeId)}
        onClose={() => setRevokeId(null)}
        title="Revoke API key"
      >
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Software using this key will no longer be able to send mail. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRevokeId(null)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              loading={revokeKey.isPending}
              onClick={() => revokeId && revokeKey.mutate(revokeId)}
            >
              Revoke
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ApiKeyRow({ record, onRevoke }: { record: ApiKeyRecord; onRevoke: () => void }) {
  return (
    <li className="px-6 py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{record.name}</p>
        <p className="text-xs font-mono text-gray-500 mt-0.5">{record.prefix}…</p>
        <p className="text-xs text-gray-400 mt-1">
          Created {formatRelative(record.created_at)}
          {record.last_used_at ? ` · Last used ${formatRelative(record.last_used_at)}` : ' · Never used'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRevoke}>Revoke</Button>
    </li>
  );
}
