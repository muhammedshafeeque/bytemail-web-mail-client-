import { memo, useState } from 'react';
import { Paperclip, Star } from 'lucide-react';
import { Email } from '@/types/email';
import { formatEmailDate } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import { useStar } from '@/hooks/useEmails';
import { EmailAvatar } from './EmailAvatar';

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
  folder: string;
}

export const EmailListItem = memo(function EmailListItem({
  email,
  isSelected,
  onClick,
  folder,
}: EmailListItemProps) {
  const starMutation = useStar();
  const [hovered, setHovered] = useState(false);
  const hasAttachments = (email.attachments?.length ?? 0) > 0;

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    starMutation.mutate({ uid: email.uid, folder, star: !email.is_starred });
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex items-start gap-3 px-3 py-3 mx-2 my-0.5 rounded-xl cursor-pointer select-none transition-colors duration-150',
        isSelected
          ? 'bg-brand-50 dark:bg-brand-950/50 ring-1 ring-brand-200/80 dark:ring-brand-800/80'
          : hovered
          ? 'bg-stone-100 dark:bg-zinc-800/70'
          : 'bg-transparent'
      )}
    >
      {!email.is_read && (
        <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-brand-500" />
      )}

      <EmailAvatar from={email.from} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'flex-1 min-w-0 truncate text-[13px]',
              email.is_read
                ? 'font-medium text-stone-600 dark:text-stone-400'
                : 'font-semibold text-stone-900 dark:text-stone-50'
            )}
          >
            {email.from.name || email.from.email}
          </span>
          <span
            className={cn(
              'flex-shrink-0 text-[11px] tabular-nums',
              email.is_read
                ? 'text-stone-400 dark:text-stone-500'
                : 'font-medium text-brand-700 dark:text-brand-400'
            )}
          >
            {formatEmailDate(email.date)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <p
            className={cn(
              'flex-1 min-w-0 truncate text-[13px] leading-snug',
              email.is_read
                ? 'font-normal text-stone-600 dark:text-stone-400'
                : 'font-medium text-stone-800 dark:text-stone-100'
            )}
          >
            {email.subject || '(no subject)'}
          </p>
          {hasAttachments && (
            <Paperclip className="h-3 w-3 text-stone-400 flex-shrink-0" />
          )}
        </div>

        {email.preview && (
          <p className="mt-0.5 text-[12px] leading-snug text-stone-400 dark:text-stone-500 line-clamp-1">
            {email.preview}
          </p>
        )}
      </div>

      <button
        onClick={handleStar}
        className={cn(
          'flex-shrink-0 mt-0.5 p-1 rounded-md transition-opacity',
          email.is_starred || hovered ? 'opacity-100' : 'opacity-0'
        )}
        title={email.is_starred ? 'Unstar' : 'Star'}
      >
        <Star
          className={cn(
            'h-3.5 w-3.5',
            email.is_starred
              ? 'text-amber-400 fill-amber-400'
              : 'text-stone-400 hover:text-amber-400'
          )}
        />
      </button>
    </div>
  );
});
