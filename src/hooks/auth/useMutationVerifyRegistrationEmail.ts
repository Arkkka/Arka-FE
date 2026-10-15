import type { EmailVerificationRequest } from '@/schemas';
import { useMutation } from '@tanstack/react-query';
import { verifyRegistrationEmail } from '@/api/auth';

export function useMutationVerifyRegistrationEmail() {
  return useMutation({
    mutationFn: (input: EmailVerificationRequest) => verifyRegistrationEmail(input),
  });
}
