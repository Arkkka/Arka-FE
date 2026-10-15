import { useMutation } from '@tanstack/react-query';
import { resendRegistrationOtp } from '@/api/auth';

export function useMutationResendRegistrationOtp() {
  return useMutation({
    mutationFn: (email: string) => resendRegistrationOtp(email),
  });
}
