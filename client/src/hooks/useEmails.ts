import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailApi } from '@/api/emailApi';
import { useEmailStore } from '@/store/emailStore';
import toast from 'react-hot-toast';

export function useEmails(folder: string, page = 1, limit = 25) {
  const { setEmails } = useEmailStore();

  return useQuery({
    queryKey: ['emails', folder, page],
    queryFn: async () => {
      const { data } = await emailApi.list(folder, page, limit);
      setEmails(data.data);
      return data;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });
}

export function useMarkRead() {
  const { markEmailRead } = useEmailStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, folder, read }: { uid: string; folder: string; read: boolean }) =>
      emailApi.markRead(uid, folder, read),
    onMutate: ({ uid }) => {
      markEmailRead(uid);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}

export function useStar() {
  const { toggleStar } = useEmailStore();

  return useMutation({
    mutationFn: ({ uid, folder, star }: { uid: string; folder: string; star: boolean }) =>
      emailApi.star(uid, folder, star),
    onMutate: ({ uid }) => {
      toggleStar(uid);
    },
  });
}

export function useDeleteEmail() {
  const { removeEmail } = useEmailStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, folder }: { uid: string; folder: string }) =>
      emailApi.delete(uid, folder),
    onMutate: ({ uid }) => {
      removeEmail(uid);
      toast.success('Email moved to Trash');
    },
    onError: () => {
      toast.error('Failed to delete email');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}

export function useMoveEmail() {
  const { removeEmail } = useEmailStore();

  return useMutation({
    mutationFn: ({ uid, folder, to }: { uid: string; folder: string; to: string }) =>
      emailApi.move(uid, folder, to),
    onMutate: ({ uid }) => {
      removeEmail(uid);
    },
    onSuccess: (_, { to }) => {
      toast.success(`Moved to ${to}`);
    },
    onError: () => {
      toast.error('Failed to move email');
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: emailApi.send,
    onSuccess: () => {
      toast.success('Email sent!');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to send email');
    },
  });
}
