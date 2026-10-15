import type { GameMode } from '@/schemas';

export const QUERY_KEYS = {
  session: ['me'] as const,
  authCapabilities: ['auth', 'capabilities'] as const,
  institutionOnboarding: ['auth', 'institution-onboarding'] as const,
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
    activity: ['dashboard', 'activity'] as const,
    leaderboard: (mode: GameMode) => ['dashboard', 'leaderboard', mode] as const,
    progress: ['dashboard', 'progress'] as const,
  },
  gameSessions: {
    all: ['game-sessions'] as const,
    detail: (sessionId: string | undefined) => ['game-sessions', 'detail', sessionId] as const,
  },
  participants: {
    all: ['participants'] as const,
    detail: (participantId: string | undefined) =>
      ['participants', 'detail', participantId] as const,
    search: (query: string) => ['participants', 'search', query] as const,
    history: (participantId: string | undefined, mode: GameMode | '') =>
      ['participants', 'history', participantId, mode] as const,
    historyPreview: (participantId: string | undefined) =>
      ['participants', 'history-preview', participantId] as const,
    leaderboard: (
      participantId: string | undefined,
      mode: GameMode | undefined,
      gameRuleVersion: string | undefined,
    ) => ['participants', 'leaderboard', participantId, mode, gameRuleVersion] as const,
  },
  devices: {
    all: ['devices'] as const,
  },
} as const;
