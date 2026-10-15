import {
  CreateGameSessionRequestSchema,
  CreateGameSessionResponseSchema,
  CreatePreparationRequestSchema,
  GameSessionDtoSchema,
  PreparationDtoSchema,
  PreparationStatusPatchRequestSchema,
  type GameSessionDto,
  type PreparationDto,
} from '@/schemas';
import { z } from 'zod';
import { apiGet, apiPatch, apiPost, requestBody } from '@/config';
import { API_ENDPOINTS } from '@/constants';

export type CreatePreparationInput = z.infer<typeof CreatePreparationRequestSchema>;

export function createPreparation(
  input: CreatePreparationInput,
  csrfToken: string,
): Promise<PreparationDto> {
  return apiPost(
    API_ENDPOINTS.games.preparations,
    requestBody(CreatePreparationRequestSchema, input),
    PreparationDtoSchema,
    csrfToken,
  );
}

export async function cancelPreparation(
  preparationId: string,
  csrfToken: string,
): Promise<void> {
  await apiPatch(
    API_ENDPOINTS.games.preparationStatus(preparationId),
    requestBody(PreparationStatusPatchRequestSchema, { command: 'CANCEL' }),
    z.null(),
    csrfToken,
  );
}

export function createGameSession(
  preparationId: string,
  csrfToken: string,
  idempotencyKey: string,
): Promise<z.infer<typeof CreateGameSessionResponseSchema>> {
  return apiPost(
    API_ENDPOINTS.games.sessions,
    requestBody(CreateGameSessionRequestSchema, { preparationId }),
    CreateGameSessionResponseSchema,
    csrfToken,
    { 'Idempotency-Key': idempotencyKey },
  );
}

export function getGameSession(sessionId: string): Promise<GameSessionDto> {
  return apiGet(API_ENDPOINTS.games.session(sessionId), GameSessionDtoSchema);
}
