import { motion } from 'framer-motion';
import {
  Inbox, Star, Send, FileText, AlertTriangle, Trash2,
  Settings, Archive, LayoutDashboard,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEmailStore } from '@/store/emailStore';
import { useUiStore } from '@/store/uiStore';
import { useCompose } from '@/hooks/useCompose';
import { useFolders } from '@/hooks/useFolders';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAuthStore } from '@/store/authStore';
import { userIsAdmin } from '@/utils/admin';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';
import { Folder } from '@/types/folder';

const NAV_ITEMS = [
  { icon: Inbox,         label: 'Inbox',   folder: 'INBOX'   },
  { icon: Star,          label: 'Starred', folder: 'Starred' },
  { icon: Send,          label: 'Sent',    folder: 'Sent'    },
  { icon: FileText,      label: 'Drafts',  folder: 'Drafts'  },
  { icon: Archive,       label: 'Archive', folder: 'Archive' },
  { icon: AlertTriangle, label: 'Spam',    folder: 'Spam'    },
  { icon: Trash2,        label: 'Trash',   folder: 'Trash'   },
];

function folderMatches(f: Folder, key: string): boolean {
  if (f.path === key || f.name === key) return true;
  const aliases: Record<string, string[]> = {
    Sent: ['\\Sent', 'Sent Mail'],
    Spam: ['\\Junk', 'Junk'],
    Trash: ['\\Trash'],
    Drafts: ['\\Drafts'],
    Archive: ['\\Archive'],
    INBOX: ['INBOX'],
  };
  return (aliases[key] ?? []).some(
    (a) => f.specialUse === a || f.name === a || f.path === a || f.flags?.includes(a),
  );
}

export function Sidebar() {
  const { selectedFolder, setSelectedFolder } = useEmailStore();
  const { sidebarCollapsed } = useUiStore();
  const { newCompose } = useCompose();
  const { data: folders } = useFolders();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const getCount = (folder: string): number => {
    const f = folders?.find((item) => folderMatches(item, folder));
    return f?.unseen ?? 0;
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col h-full bg-white dark:bg-zinc-950 flex-shrink-0 overflow-hidden border-r border-stone-200/80 dark:border-zinc-800"
    >
      <div className={cn('pt-3 pb-1', sidebarCollapsed ? 'px-3 flex justify-center' : 'px-3')}>
        <Tooltip
          content={sidebarCollapsed ? 'Compose' : ''}
          side="right"
          className={sidebarCollapsed ? 'inline-flex' : 'flex w-full'}
        >
          <button
            onClick={newCompose}
            className={cn(
              'flex items-center gap-3 font-semibold transition-all select-none',
              sidebarCollapsed
                ? 'p-3.5 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-600/25'
                : 'w-full px-5 py-3 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-600/25 text-sm'
            )}
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            {!sidebarCollapsed && <span>Compose</span>}
          </button>
        </Tooltip>
      </div>

      <nav className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden mt-2 min-w-0 px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, folder }) => {
          const count = getCount(folder);
          const isActive = selectedFolder === folder;

          return (
            <Tooltip
              key={folder}
              content={sidebarCollapsed ? label : ''}
              side="right"
              className={sidebarCollapsed ? 'inline-flex w-full justify-center' : 'flex w-full min-w-0'}
            >
              <button
                onClick={() => setSelectedFolder(folder)}
                className={cn(
                  'relative flex items-center min-w-0 transition-colors duration-150 select-none rounded-xl my-0.5',
                  sidebarCollapsed
                    ? 'justify-center py-3 px-2 w-12 mx-auto'
                    : 'gap-3 w-full py-2.5 px-3',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-800 dark:text-brand-200 font-semibold'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 font-normal'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-stone-500 dark:text-stone-400')} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left text-sm truncate">{label}</span>
                    {count > 0 && (
                      <span className="text-xs font-semibold flex-shrink-0 text-brand-700 dark:text-brand-300">{count}</span>
                    )}
                  </>
                )}
                {sidebarCollapsed && count > 0 && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-brand-600" />
                )}
              </button>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-stone-100 dark:border-zinc-800 py-2 flex-shrink-0 flex flex-col min-w-0 px-2">
        {userIsAdmin(user) && (
          <Tooltip
            content={sidebarCollapsed ? 'Platform' : ''}
            side="right"
            className={sidebarCollapsed ? 'inline-flex w-full justify-center' : 'flex w-full min-w-0'}
          >
            <Link
              to="/admin"
              className={cn(
                'flex items-center min-w-0 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors py-2.5 select-none rounded-xl',
                sidebarCollapsed
                  ? 'justify-center px-2 mx-auto w-12'
                  : 'gap-3 w-full px-3'
              )}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
              {!sidebarCollapsed && <span>Platform</span>}
            </Link>
          </Tooltip>
        )}
        <Tooltip
          content={sidebarCollapsed ? 'Settings' : ''}
          side="right"
          className={sidebarCollapsed ? 'inline-flex w-full justify-center' : 'flex w-full min-w-0'}
        >
          <Link
            to="/settings"
            className={cn(
              'flex items-center min-w-0 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors py-2.5 select-none rounded-xl',
              sidebarCollapsed
                ? 'justify-center px-2 mx-auto w-12'
                : 'gap-3 w-full px-3'
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0 text-stone-500 dark:text-stone-400" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
        </Tooltip>

        {user && (
          <Tooltip
            content={sidebarCollapsed ? user.name : ''}
            side="right"
            className={sidebarCollapsed ? 'inline-flex w-full justify-center' : 'flex w-full min-w-0'}
          >
            <div
              className={cn(
                'flex items-center min-w-0 py-2.5 cursor-pointer hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors select-none rounded-xl',
                sidebarCollapsed
                  ? 'justify-center px-2 mx-auto w-12'
                  : 'gap-3 w-full px-3'
              )}
              onClick={() => navigate('/settings')}
            >
              <Avatar name={user.name} email={user.email} color={user.avatar_color} size="sm" />
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">{user.name}</p>
                  <p className="text-xs text-stone-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
          </Tooltip>
        )}
      </div>
    </motion.aside>
  );
}
