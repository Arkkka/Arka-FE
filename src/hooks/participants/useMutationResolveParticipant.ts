import { useMutation } from '@tanstack/react-query';
import { resolveParticipant, type ResolveParticipantInput } from '@/api/participants';

export function useMutationResolveParticipant(csrfToken: string) {
  return useMutation({
    mutationFn: (input: ResolveParticipantInput) => resolveParticipant(input, csrfToken),
  });
}
