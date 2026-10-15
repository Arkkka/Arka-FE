import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createParticipant, type CreateParticipantInput } from '@/api/participants';
import { QUERY_KEYS } from '@/api/queryKeys';

export function useMutationCreateParticipant(csrfToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParticipantInput) => createParticipant(input, csrfToken),
    onSuccess: () => {
      void Promise.all([queryClient.invalidateQueries({ queryKey: QUERY_KEYS.participants.all }), queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all })]);
    },
  });
}
