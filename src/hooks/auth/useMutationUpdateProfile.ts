import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/api/auth';
import { QUERY_KEYS } from '@/constants/query-keys.ts';
import type { MeDto } from '@/schemas/index.ts';

export function useMutationUpdateProfile(csrfToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateProfile>[0]) => updateProfile(input, csrfToken),
    onSuccess: (_result, input) => {
      queryClient.setQueryData<MeDto>(QUERY_KEYS.session, (current) => current ? { ...current, user: { ...current.user, name: input.name, image: input.image }, institution: { ...current.institution, name: input.institutionName } } : current);
      return queryClient.refetchQueries({ queryKey: QUERY_KEYS.session, type: 'active' });
    },
  });
}
