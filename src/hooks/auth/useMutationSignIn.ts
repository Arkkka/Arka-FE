import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signIn } from '@/api';
import { QUERY_KEYS } from '@/constants';

export function useMutationSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session }),
  });
}
