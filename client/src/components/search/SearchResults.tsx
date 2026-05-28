import { Email } from '@/types/email';
import { EmailAvatar } from '@/components/email/EmailAvatar';
import { formatEmailDate } from '@/utils/formatDate';

interface SearchResultsProps {
  emails: Email[];
  query: string;
  onSelect: (email: Email) => void;
}

function highlight(text: string, query: string): string {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
}

export function SearchResults({ emails, query, onSelect }: SearchResultsProps) {
  if (!query || query.length < 2) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        Start typing to search your emails
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        No results for "{query}"
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
      {emails.map((email) => (
        <button
          key={email.uid}
          onClick={() => onSelect(email)}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <EmailAvatar from={email.from} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {email.from.name || email.from.email}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatEmailDate(email.date)}</span>
            </div>
            <p
              className="text-sm text-gray-600 dark:text-gray-400 truncate"
              dangerouslySetInnerHTML={{ __html: highlight(email.subject, query) }}
            />
            <p
              className="text-xs text-gray-400 truncate mt-0.5"
              dangerouslySetInnerHTML={{ __html: highlight(email.preview, query) }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
