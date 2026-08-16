export interface Folder {
  name: string;
  path: string;
  delimiter: string;
  flags: string[];
  total: number;
  unseen: number;
  uidNext: number;
  specialUse?: string | null;
  mailboxId?: string;
}

export type FolderName = 'INBOX' | 'Sent' | 'Drafts' | 'Spam' | 'Trash' | 'Starred';
