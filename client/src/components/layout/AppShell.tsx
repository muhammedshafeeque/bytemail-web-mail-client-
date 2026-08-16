import { ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';
import { MobileNav } from './MobileNav';
import { ComposeModal } from '@/components/compose/ComposeModal';
import { SearchBar } from '@/components/search/SearchBar';
import { Search, Settings, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Link } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { setOffline, setSearchOpen, sidebarCollapsed, toggleSidebar } = useUiStore();
  const isOffline = useUiStore((s) => s.isOffline);
  const { user } = useAuthStore();

  useEffect(() => {
    document.body.classList.add('app-shell');
    return () => document.body.classList.remove('app-shell');
  }, []);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setOffline]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-50 dark:bg-surface-dark">
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-medium text-center py-1.5 px-4 flex-shrink-0">
          You're offline — showing cached data
        </div>
      )}

      <header className="flex items-center h-16 flex-shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-stone-200/80 dark:border-zinc-800 px-2 gap-2">
        <motion.div
          animate={{ width: sidebarCollapsed ? 72 : 256 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex items-center gap-1 flex-shrink-0 overflow-hidden"
        >
          <button
            onClick={toggleSidebar}
            className="p-2.5 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
            title="Main menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {!sidebarCollapsed && (
            <span className="font-bold text-xl tracking-tight text-brand-600 whitespace-nowrap select-none ml-1">
              ByteMail
            </span>
          )}
        </motion.div>

        <button
          onClick={() => setSearchOpen(true)}
          className="flex-1 max-w-2xl flex items-center gap-3 px-4 py-2.5 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200/80 dark:hover:bg-zinc-700 rounded-2xl transition-colors"
        >
          <Search className="h-5 w-5 text-stone-500 dark:text-stone-400 flex-shrink-0" />
          <span className="text-sm text-stone-500 dark:text-stone-400 flex-1 text-left">Search mail</span>
        </button>

        <div className="flex items-center gap-0.5 ml-auto">
          <Link
            to="/settings"
            title="Settings"
            className="p-2.5 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors hidden md:flex items-center justify-center"
          >
            <Settings className="h-5 w-5" />
          </Link>
          {user && (
            <button
              title={user.name}
              className="ml-1 rounded-full overflow-hidden hover:ring-2 hover:ring-offset-1 hover:ring-brand-200 dark:hover:ring-brand-800 transition-all"
            >
              <Avatar name={user.name} email={user.email} color={user.avatar_color} size="sm" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>

      <div className="md:hidden flex-shrink-0">
        <MobileNav />
      </div>
      <ComposeModal />
      <SearchBar />
    </div>
  );
}
