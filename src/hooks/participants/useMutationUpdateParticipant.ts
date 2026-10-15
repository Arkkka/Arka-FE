import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateParticipant, type UpdateParticipantInput } from '@/api/participants';
import { QUERY_KEYS } from '@/api/queryKeys';

export function useMutationUpdateParticipant(participantId: string | undefined, csrfToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateParticipantInput) => {
      if (!participantId) throw new Error('Identitas peserta tidak tersedia');
      return updateParticipant(participantId, input, csrfToken);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(QUERY_KEYS.participants.detail(participantId), (current: unknown) => current && typeof current === 'object' ? { ...current, ...updated } : current);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.participants.detail(participantId),
        }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.participants.historyPreview(participantId),
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.participants.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all }),
      ]);
    },
  });
}
