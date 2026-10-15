import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes.ts';
import { useQueryGetSession as useSessionQuery } from '@/api/auth';
import { useMutationSignOut as useSignOutMutation } from './useMutationSignOut.ts';

export function useAccountPage() {
  const navigate = useNavigate();
  const session = useSessionQuery();
  const signOut = useSignOutMutation();

  useEffect(() => {
    if (signOut.isSuccess) navigate(ROUTES.landing, { replace: true });
  }, [navigate, signOut.isSuccess]);

  return { navigate, session, signOut };
}
