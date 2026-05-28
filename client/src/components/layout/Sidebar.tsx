import { motion } from 'framer-motion';
import {
  Inbox, Star, Send, FileText, AlertTriangle, Trash2,
  Settings, Archive,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEmailStore } from '@/store/emailStore';
import { useUiStore } from '@/store/uiStore';
import { useCompose } from '@/hooks/useCompose';
import { useFolders } from '@/hooks/useFolders';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { icon: Inbox,         label: 'Inbox',   folder: 'INBOX'   },
  { icon: Star,          label: 'Starred', folder: 'Starred' },
  { icon: Send,          label: 'Sent',    folder: 'Sent'    },
  { icon: FileText,      label: 'Drafts',  folder: 'Drafts'  },
  { icon: Archive,       label: 'Archive', folder: 'Archive' },
  { icon: AlertTriangle, label: 'Spam',    folder: 'Spam'    },
  { icon: Trash2,        label: 'Trash',   folder: 'Trash'   },
];

export function Sidebar() {
  const { selectedFolder, setSelectedFolder } = useEmailStore();
  const { sidebarCollapsed } = useUiStore();
  const { newCompose } = useCompose();
  const { data: folders } = useFolders();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const getCount = (folder: string): number => {
    const f = folders?.find((f) => f.name === folder || f.path === folder);
    return f?.unseen ?? 0;
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col h-full bg-white dark:bg-[#1f1f1f] flex-shrink-0 overflow-hidden"
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
              'flex items-center gap-3 font-medium transition-all select-none',
              sidebarCollapsed
                ? 'p-4 rounded-2xl bg-[#c2e7ff] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff] hover:bg-[#b0d8f5] dark:hover:bg-[#005a8e] shadow-md hover:shadow-lg'
                : 'w-full px-6 py-3.5 rounded-2xl bg-[#c2e7ff] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff] hover:bg-[#b0d8f5] dark:hover:bg-[#005a8e] shadow-md hover:shadow-lg text-sm'
            )}
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            {!sidebarCollapsed && <span>Compose</span>}
          </button>
        </Tooltip>
      </div>

      <nav className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden mt-1 min-w-0">
        {NAV_ITEMS.map(({ icon: Icon, label, folder }) => {
          const count = getCount(folder);
          const isActive = selectedFolder === folder;

          return (
            <Tooltip
              key={folder}
              content={sidebarCollapsed ? label : ''}
              side="right"
              className={sidebarCollapsed ? 'inline-flex w-full justify-center' : 'flex w-full min-w-0 pr-4'}
            >
              <button
                onClick={() => setSelectedFolder(folder)}
                className={cn(
                  'relative flex items-center min-w-0 transition-colors duration-150 select-none',
                  sidebarCollapsed
                    ? 'justify-center py-3 px-2 my-0.5 mx-2 rounded-2xl w-12'
                    : 'gap-4 w-full py-2.5 pl-6 pr-4 my-0.5',
                  isActive
                    ? sidebarCollapsed
                      ? 'bg-[#d3e3fd] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff] font-semibold'
                      : 'bg-[#d3e3fd] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff] font-semibold rounded-r-full'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-normal rounded-r-full'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-[#001d35] dark:text-[#c2e7ff]' : 'text-gray-600 dark:text-gray-400')} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left text-sm truncate">{label}</span>
                    {count > 0 && (
                      <span className="text-xs font-semibold flex-shrink-0">{count}</span>
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

      <div className="border-t border-gray-100 dark:border-gray-800 py-2 flex-shrink-0 flex flex-col min-w-0">
        <Tooltip
          content={sidebarCollapsed ? 'Settings' : ''}
          side="right"
          className={sidebarCollapsed ? 'inline-flex w-full justify-center' : 'flex w-full min-w-0 pr-4'}
        >
          <Link
            to="/settings"
            className={cn(
              'flex items-center min-w-0 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors py-2.5 select-none',
              sidebarCollapsed
                ? 'justify-center px-2 mx-2 rounded-2xl w-12'
                : 'gap-4 w-full pl-6 pr-4 rounded-r-full'
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
        </Tooltip>

        {user && (
          <Tooltip
            content={sidebarCollapsed ? user.name : ''}
            side="right"
            className={sidebarCollapsed ? 'inline-flex w-full justify-center' : 'flex w-full min-w-0 pr-4'}
          >
            <div
              className={cn(
                'flex items-center min-w-0 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none',
                sidebarCollapsed
                  ? 'justify-center px-2 mx-2 rounded-2xl w-12'
                  : 'gap-3 w-full pl-6 pr-4 rounded-r-full'
              )}
              onClick={() => navigate('/settings')}
            >
              <Avatar name={user.name} email={user.email} color={user.avatar_color} size="sm" />
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
          </Tooltip>
        )}
      </div>
    </motion.aside>
  );
}
