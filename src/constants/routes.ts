import type { GameMode } from '@/schemas';

const GAME_MODE_SLUGS: Record<GameMode, string> = {
  MOTOR_GRIP: 'motor-grip',
  GO_NO_GO: 'go-no-go',
  SEQUENCE_MEMORY: 'sequence-memory',
};

export function gameModeFromSlug(slug: string | undefined): GameMode | null {
  if (!slug) return null;
  const match = Object.entries(GAME_MODE_SLUGS).find(([, value]) => value === slug);
  return (match?.[0] as GameMode | undefined) ?? null;
}

export const ROUTES = {
  landing: '/',
  login: '/login',
  register: '/register',
  onboarding: '/onboarding',
  dashboard: '/dashboard',
  progressBoard: '/progress-board',
  rankings: '/leaderboard',
  profile: '/profile',
  mission: '/mission',
  faq: '/faq',
  contact: '/contact',
  history: '/history',
  devices: '/devices',
  participant: (participantId: string) => `/participants/${encodeURIComponent(participantId)}`,
  participantHistory: (participantId: string) =>
    `/participants/${encodeURIComponent(participantId)}/history`,
  participantEntry: (mode: GameMode) => `/play/${GAME_MODE_SLUGS[mode]}/participant`,
  preview: (mode: GameMode) => `/play/${GAME_MODE_SLUGS[mode]}/preview`,
  tutorial: (mode: GameMode) => `/play/${GAME_MODE_SLUGS[mode]}/tutorial`,
  setup: (mode: GameMode) => `/play/${GAME_MODE_SLUGS[mode]}/setup`,
  session: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}`,
  result: (sessionId: string) => `/results/${encodeURIComponent(sessionId)}`,
} as const;

export const ROUTE_PATTERNS = {
  participantEntry: '/play/:mode/participant',
  preview: '/play/:mode/preview',
  tutorial: '/play/:mode/tutorial',
  setup: '/play/:mode/setup',
  session: '/sessions/:sessionId',
  result: '/results/:sessionId',
  participantHistory: '/participants/:participantId/history',
  participant: '/participants/:participantId',
} as const;
