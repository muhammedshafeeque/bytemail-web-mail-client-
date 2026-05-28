import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useEmailStore } from '@/store/emailStore';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Email } from '@/types/email';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();
  const { prependEmail, markEmailRead, removeEmail, setUnreadCount, selectedFolder } = useEmailStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = io('/', {
      auth: { token: accessToken },
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connected', () => {
      socket.emit('join_folder', { folder: selectedFolder });
    });

    socket.on('new_email', (email: Email) => {
      prependEmail(email);
      queryClient.invalidateQueries({ queryKey: ['unread'] });
      toast.success(
        `New email from ${email.from.name || email.from.email}: ${email.subject}`,
        { duration: 5000, position: 'top-right', icon: '📧' }
      );
    });

    socket.on('email_read', ({ uid }: { uid: string }) => {
      markEmailRead(uid);
    });

    socket.on('email_deleted', ({ uid }: { uid: string }) => {
      removeEmail(uid);
    });

    socket.on('unread_count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_folder', { folder: selectedFolder });
    }
  }, [selectedFolder]);

  return socketRef.current;
}
