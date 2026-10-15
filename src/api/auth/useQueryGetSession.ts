import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from './auth.ts';
import { QUERY_KEYS } from '@/constants/query-keys.ts';

export function useQueryGetSession() {
  return useQuery({
    queryKey: QUERY_KEYS.session,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 30_000,
  });
}
