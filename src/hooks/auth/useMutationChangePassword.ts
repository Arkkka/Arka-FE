import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/api/auth';

export function useMutationChangePassword() {
  return useMutation({ mutationFn: changePassword });
}
