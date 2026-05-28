import { useQuery } from '@tanstack/react-query';
import { emailApi } from '@/api/emailApi';
import { useDebounce } from './useDebounce';

export function useSearch(query: string, folder?: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['search', debouncedQuery, folder],
    queryFn: async () => {
      const { data } = await emailApi.search(debouncedQuery, folder);
      return data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });
}
