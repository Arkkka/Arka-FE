import { useMutation } from '@tanstack/react-query';
import { createPreparation, type CreatePreparationInput } from '@/api/games';

export function useMutationCreatePreparation(csrfToken: string) {
  return useMutation({
    mutationFn: (input: CreatePreparationInput) => createPreparation(input, csrfToken),
  });
}
