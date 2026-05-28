import { useQuery } from '@tanstack/react-query';
import { emailApi } from '@/api/emailApi';
import { useEmailStore } from '@/store/emailStore';

export function useEmail(uid: string | null, folder: string) {
  const { setSelectedEmail } = useEmailStore();

  return useQuery({
    queryKey: ['email', uid, folder],
    queryFn: async () => {
      if (!uid) return null;
      const { data } = await emailApi.get(uid, folder);
      setSelectedEmail(data.data);
      return data.data;
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
  });
}
