import { X, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Email } from '@/types/email';
import { EmailAvatar } from './EmailAvatar';
import { EmailToolbar } from './EmailToolbar';
import { AttachmentList } from './AttachmentList';
import { EmailViewerSkeleton } from '@/components/ui/Skeleton';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { formatFullDate } from '@/utils/formatDate';
import { formatRecipientList } from '@/utils/emailHelpers';
import { useEmailStore } from '@/store/emailStore';
import { useUiStore } from '@/store/uiStore';
import { useState } from 'react';
import { cn } from '@/utils/cn';

interface EmailViewerProps {
  email: Email | null;
  loading?: boolean;
}

export function EmailViewer({ email, loading }: EmailViewerProps) {
  const { setSelectedUid } = useEmailStore();
  const { setMobilePanel } = useUiStore();
  const [showAllRecipients, setShowAllRecipients] = useState(false);

  const handleClose = () => {
    setSelectedUid(null);
    setMobilePanel('list');
  };

  if (loading) return <EmailViewerSkeleton />;

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-center p-8 bg-stone-50 dark:bg-zinc-950">
        <div className="h-20 w-20 rounded-full bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center">
          <svg className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-medium text-gray-600 dark:text-gray-400">Select an email to read</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">c</kbd> to compose
          </p>
        </div>
      </div>
    );
  }

  const safeHtml = sanitizeHtml(email.body_html || email.body_text?.replace(/\n/g, '<br>') || '');

  return (
    <motion.div
      key={email.uid}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col w-full h-full min-w-0 bg-stone-50 dark:bg-zinc-950 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 md:hidden">
        <button
          onClick={handleClose}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full min-w-0 px-4 md:px-6 lg:px-8 py-4 pb-8">
        <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-stone-100 dark:border-zinc-800 overflow-hidden">
          {/* Subject header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-50 leading-snug">
              {email.subject || '(no subject)'}
            </h1>
          </div>

          {/* Sender info + toolbar */}
          <div className="px-6 py-4">
            <div className="flex items-start gap-3">
              <EmailAvatar from={email.from} size="lg" />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {email.from.name || email.from.email}
                      </span>
                      {email.from.name && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          &lt;{email.from.email}&gt;
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5">
                      <button
                        onClick={() => setShowAllRecipients((v) => !v)}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        <span>
                          {showAllRecipients ? (
                            <>
                              {email.to.length > 0 && <span>To: {formatRecipientList(email.to)}</span>}
                              {email.cc.length > 0 && <span className="ml-2">Cc: {formatRecipientList(email.cc)}</span>}
                            </>
                          ) : (
                            <span>to me{email.to.length > 1 ? ` and ${email.to.length - 1} others` : ''}</span>
                          )}
                        </span>
                        <ChevronDown className={cn('h-3 w-3 transition-transform', showAllRecipients && 'rotate-180')} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <time className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFullDate(email.date)}
                    </time>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="mt-3">
                  <EmailToolbar email={email} />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-gray-700 mx-6" />

          {/* Body */}
          <div className="px-6 lg:px-8 py-6">
            {email.body_html ? (
              <div
                className="email-body text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
            ) : (
              <pre className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans break-words">
                {email.body_text}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.attachments?.length > 0 && (
            <div className="px-6 pb-6">
              <AttachmentList
                attachments={email.attachments}
                uid={email.uid}
                folder={email.folder}
              />
            </div>
          )}
        </div>

        {/* Quick reply hint */}
        <div className="mt-4 w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-stone-100 dark:border-zinc-800 px-6 py-4 flex items-center gap-3 text-sm text-stone-400 dark:text-stone-500 cursor-pointer hover:shadow-md transition-shadow group">
          <EmailAvatar from={email.to[0] ?? email.from} size="sm" />
          <span className="group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors">Click here to reply...</span>
        </div>
      </div>
    </motion.div>
  );
}
