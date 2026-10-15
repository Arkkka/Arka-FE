import {
  CreateParticipantRequestSchema,
  HistoryPageDtoSchema,
  LeaderboardDtoSchema,
  ParticipantDetailDtoSchema,
  ParticipantDtoSchema,
  ParticipantSearchQuerySchema,
  ParticipantSearchResponseSchema,
  ResolveParticipantRequestSchema,
  ResolveParticipantResponseSchema,
  UpdateParticipantRequestSchema,
  type GameMode,
  type HistoryPageDto,
  type LeaderboardDto,
  type ParticipantDetailDto,
  type ParticipantDto,
} from '@/schemas';
import type { z } from 'zod';
import { apiGet, apiPatch, apiPost, requestBody } from '@/config';
import { API_ENDPOINTS } from '@/constants';

export type ResolveParticipantInput = z.infer<typeof ResolveParticipantRequestSchema>;
export type CreateParticipantInput = z.infer<typeof CreateParticipantRequestSchema>;
export type UpdateParticipantInput = z.infer<typeof UpdateParticipantRequestSchema>;

export function searchParticipants(query: string): Promise<ParticipantDto[]> {
  const parsed = ParticipantSearchQuerySchema.parse({ query });
  const search = new URLSearchParams({ query: parsed.query });
  return apiGet(
    `${API_ENDPOINTS.participants.list}?${search.toString()}`,
    ParticipantSearchResponseSchema,
  );
}

export function createParticipant(
  input: CreateParticipantInput,
  csrfToken: string,
): Promise<ParticipantDto> {
  return apiPost(
    API_ENDPOINTS.participants.list,
    requestBody(CreateParticipantRequestSchema, input),
    ParticipantDtoSchema,
    csrfToken,
  );
}

export function resolveParticipant(
  input: ResolveParticipantInput,
  csrfToken: string,
): Promise<z.infer<typeof ResolveParticipantResponseSchema>> {
  return apiPost(
    API_ENDPOINTS.participants.resolve,
    requestBody(ResolveParticipantRequestSchema, input),
    ResolveParticipantResponseSchema,
    csrfToken,
  );
}

export function getParticipant(participantId: string): Promise<ParticipantDetailDto> {
  return apiGet(API_ENDPOINTS.participants.detail(participantId), ParticipantDetailDtoSchema);
}

export function getParticipantSessions(
  participantId: string,
  filters: { mode?: GameMode; cursor?: string } = {},
): Promise<HistoryPageDto> {
  const query = new URLSearchParams();
  if (filters.mode) query.set('mode', filters.mode);
  if (filters.cursor) query.set('cursor', filters.cursor);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet(
    `${API_ENDPOINTS.participants.sessions(participantId)}${suffix}`,
    HistoryPageDtoSchema,
  );
}

export function getParticipantLeaderboard(
  participantId: string,
  mode: GameMode,
  gameRuleVersion: string,
): Promise<LeaderboardDto> {
  const query = new URLSearchParams({ mode, ruleVersion: gameRuleVersion });
  return apiGet(
    `${API_ENDPOINTS.participants.leaderboard(participantId)}?${query.toString()}`,
    LeaderboardDtoSchema,
  );
}

export function updateParticipant(
  participantId: string,
  input: UpdateParticipantInput,
  csrfToken: string,
): Promise<ParticipantDto> {
  return apiPatch(
    API_ENDPOINTS.participants.detail(participantId),
    requestBody(UpdateParticipantRequestSchema, input),
    ParticipantDtoSchema,
    csrfToken,
  );
}
