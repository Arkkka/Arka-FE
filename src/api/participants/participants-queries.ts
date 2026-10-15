import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { GameMode } from '@/schemas';
import {
  getParticipant,
  getParticipantLeaderboard,
  getParticipantSessions,
  searchParticipants,
} from './participants.ts';
import { QUERY_KEYS } from '@/constants/query-keys.ts';

export function useQueryGetParticipantSearch(query: string) {
  const normalized = query.trim();
  return useQuery({
    queryKey: QUERY_KEYS.participants.search(normalized),
    queryFn: () => searchParticipants(normalized),
    enabled: normalized.length > 0,
  });
}

export function useQueryGetParticipant(participantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.participants.detail(participantId),
    queryFn: () => getParticipant(participantId ?? ''),
    enabled: Boolean(participantId),
    refetchInterval: (query) => ['DETERMINISTIC', 'PENDING', 'PROCESSING'].includes(query.state.data?.aggregateSummary?.source ?? '') || query.state.data?.modeSummaries.some((summary) => ['PENDING', 'PROCESSING'].includes(summary.narrativeSummary?.source ?? '')) ? 3_000 : false,
  });
}

export function useQueryGetParticipantHistory(participantId: string | undefined, mode: GameMode | '') {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.participants.history(participantId, mode),
    queryFn: ({ pageParam }) =>
      getParticipantSessions(participantId ?? '', {
        ...(mode ? { mode } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(participantId),
  });
}

export function useQueryGetParticipantHistoryPreview(participantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.participants.historyPreview(participantId),
    queryFn: () => getParticipantSessions(participantId ?? ''),
    enabled: Boolean(participantId),
  });
}

export function useQueryGetParticipantLeaderboard(
  participantId: string | undefined,
  mode: GameMode | undefined,
  gameRuleVersion: string | undefined,
) {
  return useQuery({
    queryKey: QUERY_KEYS.participants.leaderboard(participantId, mode, gameRuleVersion),
    queryFn: () =>
      getParticipantLeaderboard(participantId ?? '', mode ?? 'MOTOR_GRIP', gameRuleVersion ?? ''),
    enabled: Boolean(participantId && mode && gameRuleVersion),
  });
}
