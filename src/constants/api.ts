const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/u, '') ?? '';

export function apiUrl(path: string): string {
  return `${backendUrl}${path}`;
}

export const API_ENDPOINTS = {
  auth: {
    me: '/api/v1/me',
    capabilities: '/api/v1/auth/capabilities',
    signIn: '/api/auth/sign-in/email',
    signUp: '/api/auth/sign-up/email',
    sendVerificationOtp: '/api/auth/email-otp/send-verification-otp',
    verifyEmailOtp: '/api/auth/email-otp/verify-email',
    socialSignIn: '/api/auth/sign-in/social',
    signOut: '/api/auth/sign-out',
    changePassword: '/api/auth/change-password',
    onboarding: '/api/v1/auth/onboarding',
    profile: '/api/v1/profile',
  },
  dashboard: {
    summary: '/api/v1/dashboard/summary',
    activity: '/api/v1/dashboard/activity',
    leaderboard: '/api/v1/dashboard/leaderboard',
    progress: '/api/v1/dashboard/progress',
  },
  games: {
    preparations: '/api/v1/game-preparations',
    preparationStatus: (preparationId: string) => `/api/v1/game-preparations/${encodeURIComponent(preparationId)}/status`,
    sessions: '/api/v1/game-sessions',
    session: (sessionId: string) => `/api/v1/game-sessions/${encodeURIComponent(sessionId)}`,
    sessionReport: (sessionId: string, audience: 'participant' | 'clinician') =>
      `/api/v1/game-sessions/${encodeURIComponent(sessionId)}/report?audience=${audience}`,
  },
  participants: {
    list: '/api/v1/participants',
    resolve: '/api/v1/participants/resolve',
    detail: (participantId: string) => `/api/v1/participants/${encodeURIComponent(participantId)}`,
    report: (participantId: string, audience: 'participant' | 'clinician') =>
      `/api/v1/participants/${encodeURIComponent(participantId)}/report?audience=${audience}`,
    sessions: (participantId: string) =>
      `/api/v1/participants/${encodeURIComponent(participantId)}/sessions`,
    leaderboard: (participantId: string) =>
      `/api/v1/participants/${encodeURIComponent(participantId)}/leaderboard`,
  },
  devices: {
    list: '/api/v1/devices',
  },
} as const;
