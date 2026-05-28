import { ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';
import { MobileNav } from './MobileNav';
import { ComposeModal } from '@/components/compose/ComposeModal';
import { SearchBar } from '@/components/search/SearchBar';
import { Search, Settings, HelpCircle, Menu } from 'lucide-react';
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
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#1f1f1f]">
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-medium text-center py-1.5 px-4 flex-shrink-0">
          You're offline — showing cached data
        </div>
      )}

      {/* Gmail-style top header */}
      <header className="flex items-center h-16 flex-shrink-0 bg-white dark:bg-[#1f1f1f] px-2 gap-2">

        {/* Left: animated section — aligns perfectly with sidebar width */}
        <motion.div
          animate={{ width: sidebarCollapsed ? 72 : 256 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex items-center gap-1 flex-shrink-0 overflow-hidden"
        >
          <button
            onClick={toggleSidebar}
            className="p-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
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

        {/* Search bar — centred, Gmail pill style */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex-1 max-w-2xl flex items-center gap-3 px-4 py-2.5 bg-[#eaf1fb] dark:bg-[#2a2a2a] hover:bg-[#dce8f8] dark:hover:bg-[#333] rounded-2xl transition-colors"
        >
          <Search className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 dark:text-gray-400 flex-1 text-left">Search mail</span>
        </button>

        {/* Right icons */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            title="Help"
            className="p-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden md:flex items-center justify-center"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <Link
            to="/settings"
            title="Settings"
            className="p-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden md:flex items-center justify-center"
          >
            <Settings className="h-5 w-5" />
          </Link>
          {user && (
            <button
              title={user.name}
              className="ml-1 rounded-full overflow-hidden hover:ring-2 hover:ring-offset-1 hover:ring-gray-200 dark:hover:ring-gray-600 transition-all"
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
