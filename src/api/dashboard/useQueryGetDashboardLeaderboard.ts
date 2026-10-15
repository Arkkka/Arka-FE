import { useQuery } from '@tanstack/react-query';
import type { GameMode } from '@/schemas';
import { getDashboardLeaderboard } from './dashboard.ts';
import { QUERY_KEYS } from '@/constants/query-keys.ts';

export function useQueryGetDashboardLeaderboard(mode: GameMode, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.leaderboard(mode),
    queryFn: () => getDashboardLeaderboard(mode),
    enabled,
  });
}
