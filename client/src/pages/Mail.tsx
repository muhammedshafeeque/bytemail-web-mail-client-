import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MoreVertical, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { EmailList } from '@/components/email/EmailList';
import { EmailViewer } from '@/components/email/EmailViewer';
import { useEmailStore } from '@/store/emailStore';
import { useUiStore } from '@/store/uiStore';
import { useEmails, useMarkRead } from '@/hooks/useEmails';
import { useEmail } from '@/hooks/useEmail';
import { useSocket } from '@/hooks/useSocket';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePWA } from '@/hooks/usePWA';
import { Email } from '@/types/email';
import { emailApi } from '@/api/emailApi';
import toast from 'react-hot-toast';

const FOLDER_LABELS: Record<string, string> = {
  INBOX: 'Inbox',
  Starred: 'Starred',
  Sent: 'Sent',
  Drafts: 'Drafts',
  Spam: 'Spam',
  Trash: 'Trash',
  Archive: 'Archive',
};

export function Mail() {
  const [page, setPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);

  const { selectedUid, selectedFolder, setSelectedUid, emails } = useEmailStore();
  const { mobilePanel, setMobilePanel } = useUiStore();
  const markRead = useMarkRead();

  useSocket();
  useKeyboardShortcuts();

  const { data, isLoading } = useEmails(selectedFolder, page);
  const { data: selectedEmail, isLoading: emailLoading } = useEmail(selectedUid, selectedFolder);

  const { canInstall, install } = usePWA();

  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedUid(email.uid);
    setMobilePanel('viewer');
    if (!email.is_read) {
      markRead.mutate({ uid: email.uid, folder: selectedFolder, read: true });
    }
  }, [selectedFolder, setSelectedUid, setMobilePanel, markRead]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await emailApi.sync(selectedFolder);
      toast.success('Synced');
    } catch {
      toast.error('Sync failed');
    }
    setIsSyncing(false);
  };

  const folderLabel = FOLDER_LABELS[selectedFolder] ?? selectedFolder;
  const total = data?.total ?? 0;
  const shown = emails.length;

  const listPanel = (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-200 dark:border-zinc-800 flex-shrink-0">

        {/* Select-all checkbox + dropdown */}
        <div className="flex items-center mr-1" onClick={(e) => e.stopPropagation()}>
          <div className="h-4 w-4 rounded border-2 border-gray-400 dark:border-gray-500 hover:border-gray-600 cursor-pointer transition-colors flex-shrink-0" />
          <ChevronDown className="h-3.5 w-3.5 text-gray-500 ml-0.5 cursor-pointer" />
        </div>

        {/* Refresh */}
        <button
          onClick={handleSync}
          title="Refresh"
          className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <motion.div
            animate={{ rotate: isSyncing ? 360 : 0 }}
            transition={{ duration: 0.7, repeat: isSyncing ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshCw className="h-4 w-4" />
          </motion.div>
        </button>

        {/* More options */}
        <button
          title="More"
          className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
            <span>1–{shown} of {total}</span>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={!data?.has_more}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Folder name tab */}
      <div className="px-4 pt-3 pb-1 flex-shrink-0">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
          {folderLabel}
          {total > 0 && (
            <span className="text-xs text-gray-400 font-normal">{total}</span>
          )}
        </h2>
      </div>

      <EmailList
        emails={emails}
        selectedUid={selectedUid}
        folder={selectedFolder}
        loading={isLoading}
        onSelect={handleSelectEmail}
        hasMore={data?.has_more}
        onLoadMore={() => setPage((p) => p + 1)}
      />
    </div>
  );

  return (
    <AppShell>
      {canInstall && (
        <div className="bg-brand-600 text-white text-xs py-2 px-4 flex items-center justify-between flex-shrink-0">
          <span>Install ByteMail for a better experience</span>
          <button onClick={install} className="font-semibold underline">Install</button>
        </div>
      )}

      <ThreePanelLayout
        sidebar={<Sidebar />}
        list={listPanel}
        viewer={
          <AnimatePresence mode="wait">
            <EmailViewer
              key={selectedUid ?? 'empty'}
              email={selectedEmail ?? null}
              loading={emailLoading && !!selectedUid}
            />
          </AnimatePresence>
        }
        mobilePanel={mobilePanel}
      />
    </AppShell>
  );
}
