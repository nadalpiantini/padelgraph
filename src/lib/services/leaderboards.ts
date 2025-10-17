// Sprint 5: Leaderboards Service
// Calculates and manages leaderboards across different scopes

import { createClient } from '@/lib/supabase/server';

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  rank: number;
  value: number;
  change?: number; // Position change from last period
}

export interface Leaderboard {
  id: string;
  type: string;
  scope_id: string | null;
  metric: string;
  period_type: string;
  period_start: Date | null;
  period_end: Date | null;
  rankings: LeaderboardEntry[];
  calculated_at: Date;
}

export type LeaderboardType =
  | 'global'
  | 'club'
  | 'city'
  | 'tournament_winners'
  | 'win_streak'
  | 'social_butterfly'
  | 'traveler'
  | 'fair_play';

export type LeaderboardMetric =
  | 'elo_rating'
  | 'win_rate'
  | 'tournaments_won'
  | 'win_streak'
  | 'connections_count'
  | 'cities_visited'
  | 'fair_play_score';

/**
 * Get leaderboard by type
 */
export async function getLeaderboard(
  type: LeaderboardType,
  scopeId: string | null = null,
  metric: LeaderboardMetric = 'elo_rating',
  periodType: 'week' | 'month' | 'all_time' = 'all_time',
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  // Try to get precalculated leaderboard
  const { data: cached, error } = await supabase
    .from('leaderboard')
    .select('rankings')
    .eq('type', type)
    .eq('metric', metric)
    .eq('period_type', periodType)
    .is('scope_id', scopeId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (!error && cached && cached.rankings) {
    return (cached.rankings as LeaderboardEntry[]).slice(0, limit);
  }

  // Calculate on-demand if not cached
  return await calculateLeaderboard(type, scopeId, metric, periodType, limit);
}

/**
 * Calculate leaderboard on-demand
 */
async function calculateLeaderboard(
  type: LeaderboardType,
  scopeId: string | null,
  metric: LeaderboardMetric,
  periodType: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from('player_stats')
    .select('user_id, user_profile!inner(username, avatar_url), elo_rating, win_rate, tournaments_won, current_win_streak')
    .eq('period_type', periodType);

  // Apply scope filters
  if (type === 'club' && scopeId) {
    query = query.eq('user_profile.club_id', scopeId);
  } else if (type === 'city' && scopeId) {
    query = query.eq('user_profile.city', scopeId);
  }

  // Order by metric
  const metricColumn = getMetricColumn(metric);
  query = query.order(metricColumn, { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error calculating leaderboard:', error);
    return [];
  }

  // Format entries
  return data.map((entry, index) => {
    const profile = Array.isArray(entry.user_profile) ? entry.user_profile[0] : entry.user_profile;
    return {
      user_id: entry.user_id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      rank: index + 1,
      value: getMetricValue(entry, metric),
    };
  });
}

/**
 * Get metric column name for SQL query
 */
function getMetricColumn(metric: LeaderboardMetric): string {
  const metricMap: Record<LeaderboardMetric, string> = {
    elo_rating: 'elo_rating',
    win_rate: 'win_rate',
    tournaments_won: 'tournaments_won',
    win_streak: 'current_win_streak',
    connections_count: 'connections_count',
    cities_visited: 'cities_visited',
    fair_play_score: 'fair_play_score',
  };
  return metricMap[metric];
}

/**
 * Extract metric value from entry
 */
function getMetricValue(entry: Record<string, unknown>, metric: LeaderboardMetric): number {
  const metricMap: Record<LeaderboardMetric, string> = {
    elo_rating: 'elo_rating',
    win_rate: 'win_rate',
    tournaments_won: 'tournaments_won',
    win_streak: 'current_win_streak',
    connections_count: 'connections_count',
    cities_visited: 'cities_visited',
    fair_play_score: 'fair_play_score',
  };
  const value = entry[metricMap[metric]];
  return typeof value === 'number' ? value : 0;
}

/**
 * Get user's position in leaderboard
 */
export async function getUserPosition(
  userId: string,
  type: LeaderboardType,
  scopeId: string | null = null,
  metric: LeaderboardMetric = 'elo_rating',
  periodType: 'week' | 'month' | 'all_time' = 'all_time'
): Promise<{ rank: number; value: number; total: number } | null> {
  const leaderboard = await getLeaderboard(type, scopeId, metric, periodType, 10000);

  const userIndex = leaderboard.findIndex((entry) => entry.user_id === userId);

  if (userIndex === -1) {
    return null;
  }

  return {
    rank: userIndex + 1,
    value: leaderboard[userIndex].value,
    total: leaderboard.length,
  };
}

/**
 * Precalculate and store leaderboards (called by cron)
 */
export async function precalculateLeaderboards(): Promise<void> {
  const types: LeaderboardType[] = [
    'global',
    'tournament_winners',
    'win_streak',
    'social_butterfly',
    'traveler',
    'fair_play',
  ];

  const metrics: LeaderboardMetric[] = [
    'elo_rating',
    'win_rate',
    'tournaments_won',
    'win_streak',
  ];

  const periodTypes = ['week', 'month', 'all_time'];

  const supabase = await createClient();

  for (const type of types) {
    for (const metric of metrics) {
      for (const periodType of periodTypes) {
        const rankings = await calculateLeaderboard(
          type,
          null,
          metric,
          periodType,
          100
        );

        // Store in database
        await supabase.from('leaderboard').upsert(
          {
            type,
            scope_id: null,
            metric,
            period_type: periodType,
            period_start: null,
            period_end: null,
            rankings: rankings as unknown,
            calculated_at: new Date().toISOString(),
          },
          {
            onConflict: 'type,scope_id,metric,period_type,period_start',
          }
        );
      }
    }
  }

  console.log('Leaderboards precalculated successfully');
}

/**
 * Get top N players from leaderboard
 */
export async function getTopPlayers(
  n: number = 10,
  metric: LeaderboardMetric = 'elo_rating'
): Promise<LeaderboardEntry[]> {
  const leaderboard = await getLeaderboard('global', null, metric, 'all_time', n);
  return leaderboard;
}

/**
 * Get leaderboard with position change from previous period
 */
export async function getLeaderboardWithChanges(
  type: LeaderboardType,
  metric: LeaderboardMetric = 'elo_rating',
  periodType: 'week' | 'month' = 'week'
): Promise<LeaderboardEntry[]> {
  const currentLeaderboard = await getLeaderboard(type, null, metric, periodType);

  // Get previous period leaderboard for comparison
  const supabase = await createClient();

  const { data: previous } = await supabase
    .from('leaderboard')
    .select('rankings')
    .eq('type', type)
    .eq('metric', metric)
    .eq('period_type', periodType)
    .order('calculated_at', { ascending: false })
    .limit(2);

  if (!previous || previous.length < 2) {
    return currentLeaderboard;
  }

  const previousRankings = previous[1].rankings as LeaderboardEntry[];
  const previousMap = new Map(
    previousRankings.map((entry) => [entry.user_id, entry.rank])
  );

  // Calculate position changes
  return currentLeaderboard.map((entry) => {
    const previousRank = previousMap.get(entry.user_id);
    const change = previousRank ? previousRank - entry.rank : 0;
    return { ...entry, change };
  });
}
