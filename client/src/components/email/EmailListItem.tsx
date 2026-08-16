import { memo, useState } from 'react';
import { Star } from 'lucide-react';
import { Email } from '@/types/email';
import { formatEmailDate } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import { useStar } from '@/hooks/useEmails';

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
        'flex items-center h-[52px] px-2 cursor-pointer select-none border-b border-stone-100 dark:border-zinc-800/80 transition-all duration-100 relative',
        isSelected
          ? 'bg-brand-50 dark:bg-brand-950/40 border-b-brand-100 dark:border-b-brand-900'
          : hovered
          ? 'bg-stone-50 dark:bg-zinc-800/50'
          : 'bg-white dark:bg-zinc-950'
      )}
    >
      {/* Checkbox (on hover / selected) */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-8 transition-opacity duration-100',
          hovered || isSelected ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-4 w-4 rounded border-2 border-gray-400 dark:border-gray-500 hover:border-gray-600 transition-colors" />
      </div>

      {/* Star */}
      <button
        onClick={handleStar}
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-7 transition-opacity duration-100',
          email.is_starred ? 'opacity-100' : hovered ? 'opacity-60' : 'opacity-0'
        )}
      >
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            email.is_starred
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-400 hover:text-amber-400'
          )}
          fill={email.is_starred ? 'currentColor' : 'none'}
        />
      </button>

      {/* Sender name — fixed width, bold if unread */}
      <span
        className={cn(
          'flex-shrink-0 w-44 truncate text-sm mr-3',
          email.is_read
            ? 'font-normal text-stone-600 dark:text-stone-400'
            : 'font-bold text-stone-900 dark:text-stone-50'
        )}
      >
        {email.from.name || email.from.email}
      </span>

      {/* Subject + preview — fills remaining space */}
      <span className="flex-1 min-w-0 truncate text-sm">
        <span
          className={cn(
            email.is_read
              ? 'font-normal text-stone-700 dark:text-stone-300'
              : 'font-semibold text-stone-900 dark:text-stone-100'
          )}
        >
          {email.subject || '(no subject)'}
        </span>
        {email.preview && (
          <span className="font-normal text-stone-400 dark:text-stone-500">
            {' – '}{email.preview}
          </span>
        )}
      </span>

      {/* Date */}
      <span
        className={cn(
          'flex-shrink-0 text-xs ml-2 w-16 text-right',
          email.is_read
            ? 'font-normal text-stone-500 dark:text-stone-500'
            : 'font-semibold text-stone-800 dark:text-stone-200'
        )}
      >
        {formatEmailDate(email.date)}
      </span>

      {/* Unread dot */}
      {!email.is_read && (
        <div className="absolute left-1 h-2 w-2 rounded-full bg-brand-600" />
      )}
    </div>
  );
});
