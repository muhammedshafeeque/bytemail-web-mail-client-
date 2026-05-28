import { useEffect } from 'react';
import { useEmailStore } from '@/store/emailStore';
import { useCompose } from './useCompose';
import { useUiStore } from '@/store/uiStore';
import { useDeleteEmail, useStar, useMarkRead } from './useEmails';

export function useKeyboardShortcuts() {
  const { selectedUid, selectedEmail, selectedFolder, setSelectedFolder } = useEmailStore();
  const { newCompose, replyTo, forwardEmail } = useCompose();
  const { setSearchOpen } = useUiStore();
  const deleteEmail = useDeleteEmail();
  const starEmail = useStar();
  const markRead = useMarkRead();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="textbox"]');

      if (isTyping) return;

      switch (e.key) {
        case 'c':
          e.preventDefault();
          newCompose();
          break;
        case 'r':
          if (selectedEmail) { e.preventDefault(); replyTo(selectedEmail); }
          break;
        case 'a':
          if (selectedEmail) { e.preventDefault(); replyTo(selectedEmail, true); }
          break;
        case 'f':
          if (selectedEmail) { e.preventDefault(); forwardEmail(selectedEmail); }
          break;
        case '#':
          if (selectedUid) {
            e.preventDefault();
            deleteEmail.mutate({ uid: selectedUid, folder: selectedFolder });
          }
          break;
        case 's':
          if (selectedUid && selectedEmail) {
            e.preventDefault();
            starEmail.mutate({ uid: selectedUid, folder: selectedFolder, star: !selectedEmail.is_starred });
          }
          break;
        case 'u':
          if (selectedUid) {
            e.preventDefault();
            markRead.mutate({ uid: selectedUid, folder: selectedFolder, read: false });
          }
          break;
        case '/':
          e.preventDefault();
          setSearchOpen(true);
          break;
        case '1':
          e.preventDefault();
          setSelectedFolder('INBOX');
          break;
        case '2':
          e.preventDefault();
          setSelectedFolder('Starred');
          break;
        case '3':
          e.preventDefault();
          setSelectedFolder('Sent');
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedUid, selectedEmail, selectedFolder]);
}
