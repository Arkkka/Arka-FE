import { useQuery } from '@tanstack/react-query';
import { getInstitutionOnboarding } from './auth.ts';
import { QUERY_KEYS } from '@/api/queryKeys';

export function useQueryGetInstitutionOnboarding() {
  return useQuery({
    queryKey: QUERY_KEYS.institutionOnboarding,
    queryFn: getInstitutionOnboarding,
    retry: false,
  });
}
