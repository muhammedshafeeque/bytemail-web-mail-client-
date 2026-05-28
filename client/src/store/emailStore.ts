import { create } from 'zustand';
import { Email } from '@/types/email';

interface EmailState {
  selectedUid: string | null;
  selectedFolder: string;
  emails: Email[];
  selectedEmail: Email | null;
  unreadCount: number;
  setSelectedUid: (uid: string | null) => void;
  setSelectedFolder: (folder: string) => void;
  setEmails: (emails: Email[]) => void;
  setSelectedEmail: (email: Email | null) => void;
  setUnreadCount: (count: number) => void;
  markEmailRead: (uid: string) => void;
  toggleStar: (uid: string) => void;
  removeEmail: (uid: string) => void;
  prependEmail: (email: Email) => void;
  updateEmail: (uid: string, updates: Partial<Email>) => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  selectedUid: null,
  selectedFolder: 'INBOX',
  emails: [],
  selectedEmail: null,
  unreadCount: 0,

  setSelectedUid: (uid) => set({ selectedUid: uid }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder, selectedUid: null, selectedEmail: null }),
  setEmails: (emails) => set({ emails }),
  setSelectedEmail: (email) => set({ selectedEmail: email }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  markEmailRead: (uid) =>
    set((state) => ({
      emails: state.emails.map((e) => (e.uid === uid ? { ...e, is_read: true } : e)),
      selectedEmail:
        state.selectedEmail?.uid === uid
          ? { ...state.selectedEmail, is_read: true }
          : state.selectedEmail,
    })),

  toggleStar: (uid) =>
    set((state) => ({
      emails: state.emails.map((e) =>
        e.uid === uid ? { ...e, is_starred: !e.is_starred } : e
      ),
    })),

  removeEmail: (uid) =>
    set((state) => ({
      emails: state.emails.filter((e) => e.uid !== uid),
      selectedEmail: state.selectedEmail?.uid === uid ? null : state.selectedEmail,
      selectedUid: state.selectedUid === uid ? null : state.selectedUid,
    })),

  prependEmail: (email) =>
    set((state) => ({ emails: [email, ...state.emails] })),

  updateEmail: (uid, updates) =>
    set((state) => ({
      emails: state.emails.map((e) => (e.uid === uid ? { ...e, ...updates } : e)),
      selectedEmail:
        state.selectedEmail?.uid === uid
          ? { ...state.selectedEmail, ...updates }
          : state.selectedEmail,
    })),
}));
