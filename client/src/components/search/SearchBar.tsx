import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useSearch } from '@/hooks/useSearch';
import { useEmailStore } from '@/store/emailStore';
import { SearchResults } from './SearchResults';

export function SearchBar() {
  const { isSearchOpen, setSearchOpen, searchQuery, setSearchQuery } = useUiStore();
  const { selectedFolder, setSelectedUid, setSelectedEmail } = useEmailStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        setLocalQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSearchOpen]);

  const handleChange = (value: string) => {
    setLocalQuery(value);
    setSearchQuery(value);
  };

  const { data, isFetching } = useSearch(localQuery, selectedFolder);

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); setLocalQuery(''); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={localQuery}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Search emails..."
                className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
              {isFetching && (
                <div className="h-4 w-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              {localQuery && (
                <button onClick={() => handleChange('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <SearchResults
              emails={data?.data ?? []}
              query={localQuery}
              onSelect={(email) => {
                setSelectedUid(email.uid);
                setSelectedEmail(email);
                setSearchOpen(false);
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
