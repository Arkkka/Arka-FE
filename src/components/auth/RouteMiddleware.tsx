import { Suspense, useEffect } from 'react';
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/config';
import { routes } from '@/config/routes';
import { useSessionQuery } from '@/hooks/auth';
import { ROUTES } from '@/constants';
import { AuthGuard } from './AuthGuard.tsx';

function AuthTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      className="min-h-dvh"
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -48 }}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 48 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

function OnboardingRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSessionQuery();

  useEffect(() => {
    if (
      session.error instanceof ApiError &&
      session.error.code === 'institution_onboarding_required' &&
      location.pathname !== ROUTES.onboarding
    ) {
      navigate(ROUTES.onboarding, { replace: true });
    }
  }, [location.pathname, navigate, session.error]);

  return null;
}

function RouteFocus() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return null;
}

export function RouteMiddleware() {
  const location = useLocation();

  return (
    <LazyMotion features={domAnimation} strict>
      <OnboardingRedirect />
      <Suspense fallback={null}>
        <RouteFocus />
        <AnimatePresence initial={false} mode="wait" onExitComplete={() => document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })}>
          <Routes key={location.pathname} location={location}>
            {routes.map(({ path, component: Page, transition, access, layout: Layout }) => {
              const page = Layout ? <Layout><Page /></Layout> : <Page />;
              return (
                <Route
                  element={access === 'protected' ? <AuthGuard>{page}</AuthGuard> : transition === 'auth' ? <AuthTransition>{page}</AuthTransition> : page}
                  key={path}
                  path={path}
                />
              );
            })}
            <Route element={<Navigate replace to={ROUTES.landing} />} path="*" />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </LazyMotion>
  );
}
