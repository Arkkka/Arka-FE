import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/config';
import { ROUTES } from '@/constants';
import { useSessionQuery } from '@/hooks/auth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const session = useSessionQuery();

  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) {
      navigate(ROUTES.login, { replace: true });
    }
  }, [navigate, session.error]);

  return children;
}
