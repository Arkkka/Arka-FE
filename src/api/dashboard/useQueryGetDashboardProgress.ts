import { useQuery } from '@tanstack/react-query';
import { getDashboardProgress } from './dashboard.ts';
import { QUERY_KEYS } from '@/constants/query-keys.ts';

export function useQueryGetDashboardProgress(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.progress,
    queryFn: getDashboardProgress,
    enabled,
  });
}
