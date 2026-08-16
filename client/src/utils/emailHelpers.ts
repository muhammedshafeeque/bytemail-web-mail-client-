import { Email, EmailAddress } from '@/types/email';

export function formatEmailAddress(addr: EmailAddress): string {
  if (addr.name) return `${addr.name} <${addr.email}>`;
  return addr.email;
}

export function formatRecipientList(addrs: EmailAddress[]): string {
  return addrs.map((a) => a.name || a.email).filter(Boolean).join(', ');
}

export function displayNameFromAddress(addr?: EmailAddress | null): string {
  const name = addr?.name?.trim() ?? '';
  const email = addr?.email?.trim() ?? '';
  if (name) return name;
  if (email.includes('@')) return email.split('@')[0];
  if (email) return email;
  return '';
}

export function getSenderLabel(email: Email, folder?: string): string {
  const outbound = folder === 'Sent' || folder === 'Drafts';
  const label = outbound
    ? displayNameFromAddress(email.to?.[0]) || displayNameFromAddress(email.from)
    : displayNameFromAddress(email.from);
  return label || 'Unknown sender';
}

export function getEmailTitle(email: Email): string {
  const title = email.subject?.trim();
  return title || '(no subject)';
}

export function getThreadEmails(emails: Email[], threadId: string): Email[] {
  return emails
    .filter((e) => e.thread_id === threadId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageMimetype(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

export function getAttachmentIcon(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.includes('pdf')) return 'file-text';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'file-text';
  if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'file-spreadsheet';
  if (mimetype.includes('zip') || mimetype.includes('compressed')) return 'archive';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'music';
  return 'file';
}
