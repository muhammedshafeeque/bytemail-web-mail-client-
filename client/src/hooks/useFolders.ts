import { useQuery } from '@tanstack/react-query';
import { folderApi } from '@/api/folderApi';

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data } = await folderApi.list();
      return data.data;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread'],
    queryFn: async () => {
      const { data } = await folderApi.unread();
      return data.data.count;
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });
}
