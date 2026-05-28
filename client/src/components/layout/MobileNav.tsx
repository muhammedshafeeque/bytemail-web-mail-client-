import { Inbox, Star, Send, PenSquare, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEmailStore } from '@/store/emailStore';
import { useCompose } from '@/hooks/useCompose';
import { Badge } from '@/components/ui/Badge';
import { useUnreadCount } from '@/hooks/useFolders';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { icon: Inbox, label: 'Inbox', folder: 'INBOX', showBadge: true },
  { icon: Star, label: 'Starred', folder: 'Starred', showBadge: false },
  { icon: Send, label: 'Sent', folder: 'Sent', showBadge: false },
];

export function MobileNav() {
  const { selectedFolder, setSelectedFolder } = useEmailStore();
  const { newCompose } = useCompose();
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <nav className="flex items-center justify-around px-2 py-1 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-bottom">
      {NAV_ITEMS.map(({ icon: Icon, label, folder, showBadge }) => (
        <button
          key={folder}
          onClick={() => setSelectedFolder(folder)}
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors min-w-[60px]',
            selectedFolder === folder
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          <div className="relative">
            <Icon className="h-5 w-5" strokeWidth={selectedFolder === folder ? 2 : 1.5} />
            {showBadge && unreadCount > 0 && (
              <Badge count={unreadCount} className="absolute -top-1.5 -right-2 scale-75" />
            )}
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}

      <button
        onClick={newCompose}
        className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-gray-500 dark:text-gray-400"
      >
        <PenSquare className="h-5 w-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Compose</span>
      </button>

      <Link
        to="/settings"
        className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-gray-500 dark:text-gray-400"
      >
        <Settings className="h-5 w-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Settings</span>
      </Link>
    </nav>
  );
}
