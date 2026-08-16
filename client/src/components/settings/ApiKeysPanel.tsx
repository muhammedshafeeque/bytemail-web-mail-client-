import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { apiKeyApi, ApiKeyExpiry, ApiKeyRecord } from '@/api/apiKeyApi';
import { formatRelative } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import { buildApiExamples } from './apiKeyExamples';

const EXPIRY_OPTIONS: { value: ApiKeyExpiry; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'never', label: 'Never expires' },
];

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
  const [expiresIn, setExpiresIn] = useState<ApiKeyExpiry>('90d');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [lang, setLang] = useState('curl');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bytemail.repod.online';
  const examples = useMemo(() => buildApiExamples(origin), [origin]);
  const activeExample = examples.find((item) => item.id === lang) ?? examples[0];

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await apiKeyApi.list();
      return data.data;
    },
  });

  const createKey = useMutation({
    mutationFn: () => apiKeyApi.create(name.trim(), expiresIn),
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

  const handleCopyExample = async () => {
    const ok = await copyText(activeExample.code);
    if (ok) {
      setCopiedExample(true);
      toast.success('Example copied');
      window.setTimeout(() => setCopiedExample(false), 1500);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">API keys</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Let other software send mail as you through ByteMail. Keys identify your account; From is always your address.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Create a key</h3>
            <form
              className="grid grid-cols-1 sm:grid-cols-[1fr_12rem_auto] gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) {
                  toast.error('Give this key a name');
                  return;
                }
                createKey.mutate();
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name, e.g. CRM or Invoice bot"
                maxLength={80}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value as ApiKeyExpiry)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Button type="submit" size="sm" loading={createKey.isPending} className="h-[38px]">
                Generate key
              </Button>
            </form>
            <p className="text-xs text-gray-500">
              The full secret is shown only once. Expired or revoked keys are rejected on send.
            </p>
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
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 min-w-0 xl:sticky xl:top-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Example request</h3>
              <p className="text-xs text-gray-500 mt-1">
                POST /api/v1/mail/send with the <span className="font-mono">X-API-Key</span> header.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleCopyExample}>
              {copiedExample ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {examples.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => setLang(example.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                  lang === example.id
                    ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-800'
                    : 'bg-stone-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300',
                )}
              >
                {example.label}
              </button>
            ))}
          </div>

          <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-stone-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4 overflow-auto whitespace-pre min-h-[22rem] max-h-[32rem]">
            {activeExample.code}
          </pre>
        </div>
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
  const expired = record.expires_at ? new Date(record.expires_at).getTime() <= Date.now() : false;

  return (
    <li className="px-6 py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{record.name}</p>
          {expired && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
              Expired
            </span>
          )}
        </div>
        <p className="text-xs font-mono text-gray-500 mt-0.5">{record.prefix}…</p>
        <p className="text-xs text-gray-400 mt-1">
          Created {formatRelative(record.created_at)}
          {record.last_used_at ? ` · Last used ${formatRelative(record.last_used_at)}` : ' · Never used'}
          {' · '}
          {expiryLabel(record.expires_at, expired)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRevoke}>Revoke</Button>
    </li>
  );
}

function expiryLabel(expiresAt: string | null, expired: boolean): string {
  if (!expiresAt) return 'Never expires';
  if (expired) return `Expired ${formatRelative(expiresAt)}`;
  return `Expires ${formatRelative(expiresAt)}`;
}
