import { lazy, type ComponentType, type ReactNode } from 'react';
import { ROUTES, ROUTE_PATTERNS } from '@/constants';

const LoginLayout = lazy(() => import('@/components/auth-shell/LoginLayout'));
const RegisterLayout = lazy(() => import('@/components/auth-shell/RegisterLayout'));
const MarketingLayout = lazy(() => import('@/components/marketing-shell'));

export type AppRoute = {
  path: string;
  component: ComponentType;
  access?: 'protected';
  transition?: 'auth';
  layout?: ComponentType<{ children: ReactNode }>;
};

export const routes: readonly AppRoute[] = [
  { path: ROUTES.landing, component: lazy(() => import('@/pages/landing')) },
  { path: ROUTES.dashboard, access: 'protected', component: lazy(() => import('@/pages/dashboard')) },
  { path: ROUTES.progressBoard, access: 'protected', component: lazy(() => import('@/pages/leaderboard')) },
  { path: ROUTES.rankings, access: 'protected', component: lazy(() => import('@/pages/rankings')) },
  { path: ROUTE_PATTERNS.participant, access: 'protected', component: lazy(() => import('@/pages/participants/detail')) },
  { path: ROUTE_PATTERNS.participantHistory, access: 'protected', component: lazy(() => import('@/pages/participants/history')) },
  { path: ROUTE_PATTERNS.session, access: 'protected', component: lazy(() => import('@/pages/sessions/detail')) },
  { path: ROUTES.profile, access: 'protected', component: lazy(() => import('@/pages/profile')) },
  { path: ROUTE_PATTERNS.participantEntry, access: 'protected', component: lazy(() => import('@/pages/game-mode')) },
  { path: ROUTE_PATTERNS.preview, component: lazy(() => import('@/pages/game-mode/GamePreviewPage.tsx').then((page) => ({ default: page.GamePreviewPage }))) },
  { path: ROUTES.mission, layout: MarketingLayout, component: lazy(() => import('@/pages/mission')) },
  { path: ROUTES.faq, layout: MarketingLayout, component: lazy(() => import('@/pages/faq')) },
  { path: ROUTES.contact, layout: MarketingLayout, component: lazy(() => import('@/pages/contact')) },
  { path: ROUTES.onboarding, component: lazy(() => import('@/pages/onboarding')) },
  { path: ROUTES.login, layout: LoginLayout, component: lazy(() => import('@/pages/auth/login')), transition: 'auth' },
  { path: ROUTES.register, layout: RegisterLayout, component: lazy(() => import('@/pages/auth/register')), transition: 'auth' },
];
