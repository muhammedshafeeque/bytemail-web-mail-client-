import { useState } from 'react';
import { ArrowLeft, User, Palette, PenLine, Bell, Keyboard, Shield, KeyRound, LayoutDashboard } from 'lucide-react';
import { ApiKeysPanel } from '@/components/settings/ApiKeysPanel';
import { AccountPanel } from '@/components/settings/AccountPanel';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/compose/RichTextEditor';
import { useAuthStore } from '@/store/authStore';
import { userIsAdmin } from '@/utils/admin';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/api/client';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';

const ACCENT_COLORS = [
  { name: 'teal', color: '#0D9488' },
  { name: 'indigo', color: '#4F46E5' },
  { name: 'blue', color: '#2563EB' },
  { name: 'green', color: '#16A34A' },
  { name: 'rose', color: '#E11D48' },
  { name: 'orange', color: '#EA580C' },
] as const;

const AVATAR_COLORS = [
  '#0D9488', '#4F46E5', '#7C3AED', '#DB2777',
  '#DC2626', '#D97706', '#0284C7', '#0891B2',
];

const KEYBOARD_SHORTCUTS = [
  { key: 'c', description: 'Compose new email' },
  { key: 'r', description: 'Reply to selected email' },
  { key: 'a', description: 'Reply all' },
  { key: 'f', description: 'Forward' },
  { key: 'e', description: 'Archive' },
  { key: '#', description: 'Delete (move to trash)' },
  { key: 's', description: 'Toggle star' },
  { key: 'u', description: 'Mark unread' },
  { key: '/', description: 'Focus search' },
  { key: 'Esc', description: 'Close compose / email' },
  { key: '1', description: 'Go to Inbox' },
  { key: '2', description: 'Go to Starred' },
  { key: '3', description: 'Go to Sent' },
  { key: 'Ctrl+Enter', description: 'Send email (in compose)' },
];

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'signature', label: 'Signature', icon: PenLine },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'api-keys', label: 'API keys', icon: KeyRound },
  { id: 'account', label: 'Account', icon: Shield },
];

export function Settings() {
  const { user, updateUser } = useAuthStore();
  const [activeSection, setActiveSection] = useState('profile');
  const [signature, setSignature] = useState(user?.preferences?.signature ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const updateSettings = async (updates: Record<string, unknown>) => {
    const { data } = await api.put('/settings', updates);
    return (data as { data: typeof user }).data;
  };

  const saveProfile = async (name: string, avatarColor: string) => {
    setIsSavingProfile(true);
    try {
      const updated = await updateSettings({ name, avatar_color: avatarColor });
      if (updated) updateUser(updated);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
    setIsSavingProfile(false);
  };

  const savePreference = async (key: string, value: unknown) => {
    try {
      const updated = await updateSettings({ preferences: { [key]: value } });
      if (updated) updateUser(updated);
    } catch {
      toast.error('Failed to update preference');
    }
  };

  const saveSignature = async () => {
    try {
      await updateSettings({ preferences: { signature } });
      updateUser({ preferences: { ...user!.preferences, signature } });
      toast.success('Signature saved');
    } catch {
      toast.error('Failed to save signature');
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="flex h-full">
        <aside className="hidden md:flex flex-col w-52 border-r border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 p-3 gap-0.5">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Mail
          </Link>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">Settings</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                activeSection === id
                  ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          {userIsAdmin(user) && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mt-4 mb-2">Admin</p>
              <Link
                to="/admin"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950"
              >
                <LayoutDashboard className="h-4 w-4" />
                Platform
              </Link>
            </>
          )}
        </aside>

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className={cn(
            'mx-auto px-6 py-8 w-full',
            activeSection === 'api-keys' ? 'max-w-none' : 'max-w-2xl',
          )}>
            <div className="flex items-center gap-3 mb-8 md:hidden">
              <Link to="/" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
            </div>

            {activeSection === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Profile</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your personal information</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar name={user.name} email={user.email} color={user.avatar_color} size="lg" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display name</label>
                      <ProfileNameForm user={user} onSave={saveProfile} isSaving={isSavingProfile} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar color</label>
                      <div className="flex gap-2 flex-wrap">
                        {AVATAR_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => saveProfile(user.name, color)}
                            className={cn(
                              'h-8 w-8 rounded-full transition-all',
                              user.avatar_color === color ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-105'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                      <input
                        value={user.email}
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'appearance' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customize how ByteMail looks</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => savePreference('theme', t)}
                          className={cn(
                            'py-2.5 px-4 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                            user.preferences.theme === t
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Accent color</label>
                    <div className="flex gap-3">
                      {ACCENT_COLORS.map(({ name, color }) => (
                        <button
                          key={name}
                          onClick={() => savePreference('accent', name)}
                          className={cn(
                            'h-9 w-9 rounded-full transition-all',
                            user.preferences.accent === name ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Density</label>
                    <div className="flex gap-3">
                      {(['comfortable', 'compact'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => savePreference('density', d)}
                          className={cn(
                            'py-2 px-4 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                            user.preferences.density === d
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'signature' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Email Signature</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add a signature to your emails</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <RichTextEditor
                    value={signature}
                    onChange={(html) => setSignature(html)}
                    placeholder="Write your signature..."
                    minHeight="150px"
                  />
                </div>
                <Button onClick={saveSignature} size="sm">Save signature</Button>
              </motion.div>
            )}

            {activeSection === 'notifications' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Notifications</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Control how you're notified</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Push notifications</p>
                      <p className="text-xs text-gray-500 mt-0.5">Get notified of new emails</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!('Notification' in window)) { toast.error('Not supported in this browser'); return; }
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') toast.success('Push notifications enabled');
                        else toast.error('Permission denied');
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                    >
                      Enable
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'shortcuts' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Keyboard Shortcuts</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Navigate ByteMail with your keyboard</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                  {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
                    <div key={key} className="flex items-center justify-between px-6 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{description}</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-700">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === 'api-keys' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <ApiKeysPanel />
              </motion.div>
            )}

            {activeSection === 'account' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <AccountPanel />
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}

function ProfileNameForm({
  user,
  onSave,
  isSaving,
}: {
  user: { name: string; avatar_color: string };
  onSave: (name: string, color: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(user.name);
  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <Button size="sm" onClick={() => onSave(name, user.avatar_color)} loading={isSaving}>
        Save
      </Button>
    </div>
  );
}
