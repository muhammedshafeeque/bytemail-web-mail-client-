import { Reply, ReplyAll, Forward, Trash2, Archive, MoreVertical, Star } from 'lucide-react';
import { Email } from '@/types/email';
import { Tooltip } from '@/components/ui/Tooltip';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { useDeleteEmail, useStar, useMoveEmail } from '@/hooks/useEmails';
import { useCompose } from '@/hooks/useCompose';
import { useEmailStore } from '@/store/emailStore';
import { cn } from '@/utils/cn';

interface EmailToolbarProps {
  email: Email;
}

function IconButton({ onClick, title, children, className }: { onClick?: () => void; title?: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        className
      )}
    >
      {children}
    </button>
  );
}

export function EmailToolbar({ email }: EmailToolbarProps) {
  const { replyTo, forwardEmail } = useCompose();
  const deleteEmail = useDeleteEmail();
  const starEmail = useStar();
  const moveEmail = useMoveEmail();
  const { selectedFolder } = useEmailStore();

  const moreItems: DropdownItem[] = [
    { label: 'Mark as unread', onClick: () => {} },
    {
      label: 'Move to Spam',
      onClick: () => moveEmail.mutate({ uid: email.uid, folder: selectedFolder, to: 'Spam' }),
      divider: true,
    },
    {
      label: 'Delete permanently',
      danger: true,
      onClick: () => deleteEmail.mutate({ uid: email.uid, folder: 'Trash' }),
    },
  ];

  return (
    <div className="flex items-center gap-0.5 flex-wrap -ml-2">
      <Tooltip content="Reply (r)">
        <button
          onClick={() => replyTo(email)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-[#f2f6fc] dark:hover:bg-gray-700 hover:border-gray-400 transition-all"
        >
          <Reply className="h-4 w-4" />
          Reply
        </button>
      </Tooltip>

      <Tooltip content="Reply All (a)">
        <IconButton onClick={() => replyTo(email, true)} title="Reply All">
          <ReplyAll className="h-4 w-4" />
        </IconButton>
      </Tooltip>

      <Tooltip content="Forward (f)">
        <IconButton onClick={() => forwardEmail(email)} title="Forward">
          <Forward className="h-4 w-4" />
        </IconButton>
      </Tooltip>

      <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

      <Tooltip content={email.is_starred ? 'Unstar' : 'Star (s)'}>
        <IconButton
          onClick={() => starEmail.mutate({ uid: email.uid, folder: selectedFolder, star: !email.is_starred })}
        >
          <Star
            className={cn('h-4 w-4', email.is_starred ? 'text-amber-400 fill-amber-400' : '')}
            fill={email.is_starred ? 'currentColor' : 'none'}
          />
        </IconButton>
      </Tooltip>

      <Tooltip content="Archive (e)">
        <IconButton onClick={() => moveEmail.mutate({ uid: email.uid, folder: selectedFolder, to: 'Archive' })}>
          <Archive className="h-4 w-4" />
        </IconButton>
      </Tooltip>

      <Tooltip content="Delete (#)">
        <IconButton
          onClick={() => deleteEmail.mutate({ uid: email.uid, folder: selectedFolder })}
          className="hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </Tooltip>

      <Dropdown
        trigger={
          <IconButton>
            <MoreVertical className="h-4 w-4" />
          </IconButton>
        }
        items={moreItems}
      />
    </div>
  );
}
