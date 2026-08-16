import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { accountApi, DeviceSession } from '@/api/accountApi';
import { formatRelative } from '@/utils/formatDate';
import { cn } from '@/utils/cn';

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'Must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export function AccountPanel() {
  const { user, updateUser } = useAuthStore();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupQr, setSetupQr] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await accountApi.listSessions();
      return data.data;
    },
  });

  const changePassword = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      accountApi.changePassword(data),
    onSuccess: () => { toast.success('Password changed'); reset(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to change password'),
  });

  const startSetup = useMutation({
    mutationFn: () => accountApi.setupTwoFactor(),
    onSuccess: ({ data }) => {
      setSetupSecret(data.data.secret);
      setSetupQr(data.data.qr);
      setSetupCode('');
      setSetupOpen(true);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Could not start two-factor setup'),
  });

  const enable2fa = useMutation({
    mutationFn: () => accountApi.enableTwoFactor(setupCode.trim()),
    onSuccess: ({ data }) => {
      setBackupCodes(data.data.backup_codes);
      setSetupOpen(false);
      updateUser({ two_factor_enabled: true, two_factor_enabled_at: new Date().toISOString() });
      toast.success('Two-factor authentication enabled');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Invalid authenticator code'),
  });

  const disable2fa = useMutation({
    mutationFn: () => accountApi.disableTwoFactor(disableCode.trim()),
    onSuccess: () => {
      setDisableOpen(false);
      setDisableCode('');
      updateUser({ two_factor_enabled: false, two_factor_enabled_at: null });
      toast.success('Two-factor authentication disabled');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Invalid code'),
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) => accountApi.revokeSession(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<DeviceSession[]>(['sessions'], (current) =>
        (current ?? []).filter((session) => session.id !== id),
      );
      toast.success('Device signed out');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Could not sign out device'),
  });

  const revokeOthers = useMutation({
    mutationFn: () => accountApi.revokeOtherSessions(),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(data.message);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Could not sign out other devices'),
  });

  const revokeAll = useMutation({
    mutationFn: () => accountApi.revokeAllSessions(),
    onSuccess: () => logout.mutate(),
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Could not sign out everywhere'),
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Account</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Security and account settings</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Account info</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Email</dt>
            <dd className="text-gray-900 dark:text-gray-100">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Last login</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {user.last_login ? formatRelative(user.last_login) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Member since</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {user.created_at ? formatRelative(user.created_at) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Change Password</h3>
        <form onSubmit={handleSubmit((data) => changePassword.mutate(data as { current_password: string; new_password: string }))} className="space-y-3">
          <input
            {...register('current_password')}
            type="password"
            placeholder="Current password"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            {...register('new_password')}
            type="password"
            placeholder="New password (min 8 chars)"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            {...register('confirm_password')}
            type="password"
            placeholder="Confirm new password"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.confirm_password && (
            <p className="text-xs text-red-500">{errors.confirm_password.message as string}</p>
          )}
          <Button type="submit" size="sm" loading={changePassword.isPending}>Update password</Button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Two-factor authentication</h3>
            <p className="text-xs text-gray-500 mt-1">
              After your mail password succeeds, ByteMail asks for an authenticator code.
            </p>
          </div>
          {user.two_factor_enabled ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
              On
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-zinc-800">
              Off
            </span>
          )}
        </div>
        {user.two_factor_enabled ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Enabled {user.two_factor_enabled_at ? formatRelative(user.two_factor_enabled_at) : 'already'}.
              Backup codes were shown once when you turned this on.
            </p>
            <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>Disable</Button>
          </div>
        ) : (
          <Button size="sm" loading={startSetup.isPending} onClick={() => startSetup.mutate()}>
            Enable authenticator
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Devices</h3>
            <p className="text-xs text-gray-500 mt-0.5">Sessions signed in to ByteMail</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={revokeOthers.isPending}
            onClick={() => revokeOthers.mutate()}
            disabled={sessions.filter((s) => !s.current).length === 0}
          >
            Sign out other devices
          </Button>
        </div>
        {sessionsLoading ? (
          <p className="px-6 py-8 text-sm text-gray-500">Loading devices…</p>
        ) : sessions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">No active sessions.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {sessions.map((session) => (
              <li key={session.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{session.label}</p>
                    {session.current && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{session.ip}</p>
                  <p className="text-xs text-gray-400 mt-1">Last active {formatRelative(session.lastSeen)}</p>
                </div>
                {!session.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={revokeSession.isPending}
                    onClick={() => revokeSession.mutate(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sign out</h3>
        <p className="text-xs text-gray-500">End this device, or every ByteMail session at once.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" size="sm" onClick={() => logout.mutate()} loading={logout.isPending}>
            Sign out this device
          </Button>
          <Button variant="outline" size="sm" onClick={() => revokeAll.mutate()} loading={revokeAll.isPending}>
            Sign out everywhere
          </Button>
        </div>
      </div>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Enable authenticator">
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scan this QR code in an authenticator app, then enter the 6-digit code.
          </p>
          {setupQr && (
            <img src={setupQr} alt="Authenticator QR code" className="mx-auto h-44 w-44 rounded-xl border border-gray-200 dark:border-gray-700" />
          )}
          <p className="text-xs text-gray-500">
            Or enter this key manually:
            <span className="block mt-1 font-mono break-all text-gray-800 dark:text-gray-200">{setupSecret}</span>
          </p>
          <input
            value={setupCode}
            onChange={(e) => setSetupCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 tracking-widest"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSetupOpen(false)}>Cancel</Button>
            <Button size="sm" loading={enable2fa.isPending} onClick={() => enable2fa.mutate()}>Verify and enable</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(backupCodes)} onClose={() => setBackupCodes(null)} title="Save backup codes">
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Store these codes somewhere safe. Each one can be used once if you lose your authenticator.
          </p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {(backupCodes ?? []).map((code) => (
              <li key={code} className="px-3 py-2 rounded-lg bg-stone-50 dark:bg-zinc-950 border border-gray-200 dark:border-gray-800">
                {code}
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={() => setBackupCodes(null)}>I saved these codes</Button>
        </div>
      </Modal>

      <Modal open={disableOpen} onClose={() => setDisableOpen(false)} title="Disable two-factor">
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter an authenticator code or an unused backup code.
          </p>
          <input
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="Code"
            className={cn(
              'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500',
            )}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={disable2fa.isPending} onClick={() => disable2fa.mutate()}>
              Disable
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
