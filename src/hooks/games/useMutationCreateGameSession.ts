import { useMutation } from '@tanstack/react-query';
import { createGameSession } from '@/api/games';

export function useMutationCreateGameSession(csrfToken: string) {
  return useMutation({
    mutationFn: ({
      preparationId,
      idempotencyKey,
    }: {
      preparationId: string;
      idempotencyKey: string;
    }) => createGameSession(preparationId, csrfToken, idempotencyKey),
  });
}
