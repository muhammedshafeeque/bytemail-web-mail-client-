import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Mail } from 'lucide-react';
import { Email } from '@/types/email';
import { EmailListItem } from './EmailListItem';
import { EmailListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface EmailListProps {
  emails: Email[];
  selectedUid: string | null;
  folder: string;
  loading?: boolean;
  onSelect: (email: Email) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function EmailList({
  emails,
  selectedUid,
  folder,
  loading,
  onSelect,
  hasMore,
  onLoadMore,
}: EmailListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 82,
    overscan: 5,
  });

  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasMore || !onLoadMore) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    if (scrollHeight - scrollTop - clientHeight < 300) onLoadMore();
  }, [hasMore, onLoadMore]);

  if (loading && emails.length === 0) return <EmailListSkeleton />;

  if (!loading && emails.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="No messages"
        description="This folder is empty."
      />
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const email = emails[virtualItem.index];
          return (
            <div
              key={email.uid}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
            >
              <EmailListItem
                email={email}
                isSelected={email.uid === selectedUid}
                folder={folder}
                onClick={() => onSelect(email)}
              />
            </div>
          );
        })}
      </div>

      {loading && emails.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
