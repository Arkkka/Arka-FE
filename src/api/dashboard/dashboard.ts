import {
  DashboardActivityDtoSchema,
  DashboardLeaderboardDtoSchema,
  DashboardProgressDtoSchema,
  DashboardSummaryDtoSchema,
} from '@/schemas';
import type { GameMode } from '@/schemas';
import type { z } from 'zod';
import { apiGet } from '@/config';
import { API_ENDPOINTS } from '@/constants';

export function getDashboardActivity(): Promise<z.infer<typeof DashboardActivityDtoSchema>> {
  return apiGet(API_ENDPOINTS.dashboard.activity, DashboardActivityDtoSchema);
}

export function getDashboardLeaderboard(mode: GameMode) {
  const query = new URLSearchParams({ mode });
  return apiGet(
    `${API_ENDPOINTS.dashboard.leaderboard}?${query.toString()}`,
    DashboardLeaderboardDtoSchema,
  );
}

export function getDashboardProgress(): Promise<z.infer<typeof DashboardProgressDtoSchema>> {
  return apiGet(API_ENDPOINTS.dashboard.progress, DashboardProgressDtoSchema);
}

export function getDashboardSummary(): Promise<z.infer<typeof DashboardSummaryDtoSchema>> {
  return apiGet(API_ENDPOINTS.dashboard.summary, DashboardSummaryDtoSchema);
}
