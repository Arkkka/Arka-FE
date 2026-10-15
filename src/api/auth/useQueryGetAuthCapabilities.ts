import { useQuery } from '@tanstack/react-query';
import { getAuthCapabilities } from './auth.ts';
import { QUERY_KEYS } from '@/constants/query-keys.ts';

export function useQueryGetAuthCapabilities() {
  return useQuery({
    queryKey: QUERY_KEYS.authCapabilities,
    queryFn: getAuthCapabilities,
    staleTime: 5 * 60_000,
  });
}
