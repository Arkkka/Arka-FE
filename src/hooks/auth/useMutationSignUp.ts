import type { EmailRegistrationRequest } from '@/schemas';
import { useMutation } from '@tanstack/react-query';
import { signUp } from '@/api/auth';

export function useMutationSignUp() {
  return useMutation({
    mutationFn: (input: EmailRegistrationRequest) => signUp(input),
  });
}
