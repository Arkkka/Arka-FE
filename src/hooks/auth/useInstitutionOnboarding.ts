import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeInstitutionOnboarding, useQueryGetInstitutionOnboarding } from '@/api/auth';
import { QUERY_KEYS } from '@/constants';

export function useInstitutionOnboarding(institutionName: string) {
  const queryClient = useQueryClient();
  const onboarding = useQueryGetInstitutionOnboarding();
  const complete = useMutation({
    mutationFn: () => {
      if (!onboarding.data) throw new Error('onboarding_status_missing');
      return completeInstitutionOnboarding(
        { institutionName },
        onboarding.data.csrfToken,
      );
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.institutionOnboarding }),
    ]),
  });

  return { onboarding, complete };
}
