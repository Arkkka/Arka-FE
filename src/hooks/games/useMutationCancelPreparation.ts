import { useMutation } from '@tanstack/react-query';
import { cancelPreparation } from '@/api/games';

export function useMutationCancelPreparation(csrfToken: string) {
  return useMutation({
    mutationFn: (preparationId: string) => cancelPreparation(preparationId, csrfToken),
  });
}
