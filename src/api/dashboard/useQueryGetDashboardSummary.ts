import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from './dashboard.ts';
import { QUERY_KEYS } from '@/constants/query-keys.ts';

export function useQueryGetDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.summary,
    queryFn: getDashboardSummary,
    enabled,
  });
}
