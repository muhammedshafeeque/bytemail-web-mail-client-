import { Download, File, FileText, Image } from 'lucide-react';
import { Attachment } from '@/types/email';
import { formatFileSize } from '@/utils/emailHelpers';

interface AttachmentListProps {
  attachments: Attachment[];
  uid: string;
  folder: string;
}

function getAttachmentIcon(mimetype: string) {
  if (mimetype.startsWith('image/')) return Image;
  if (mimetype.includes('pdf') || mimetype.includes('document')) return FileText;
  return File;
}

export function AttachmentList({ attachments, uid, folder }: AttachmentListProps) {
  if (!attachments.length) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att, i) => {
          const Icon = getAttachmentIcon(att.mimetype);
          return (
            <a
              key={i}
              href={`/api/attachments/${uid}/${i}?folder=${encodeURIComponent(folder)}`}
              download={att.filename}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group max-w-[240px]"
            >
              <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {att.filename}
                </p>
                <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
              </div>
              <Download className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
