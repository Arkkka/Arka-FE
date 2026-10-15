import { useMutation } from '@tanstack/react-query';
import { beginGoogleSignIn } from '@/api/auth';
export function useMutationGoogleSignIn() {
  return useMutation({
    mutationFn: (intent: 'login' | 'register') => beginGoogleSignIn(intent),
  });
}
