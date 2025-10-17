// Sprint 5: Player Analytics Service
// Calculates and retrieves player statistics

import { createClient } from '@/lib/supabase/server';

export interface PlayerStats {
  user_id: string;
  period_type: 'day' | 'week' | 'month' | 'all_time';
  period_start: Date;
  period_end: Date;
  total_matches: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  total_games_won: number;
  total_games_lost: number;
  games_diff: number;
  avg_score_per_match: number;
  current_win_streak: number;
  best_win_streak: number;
  tournaments_played: number;
  tournaments_won: number;
  avg_tournament_placement: number;
  elo_rating: number;
  elo_change: number;
  skill_level: string;
  calculated_at: Date;
}

export interface StatsEvolution {
  date: string;
  win_rate: number;
  elo_rating: number;
  matches_played: number;
}

/**
 * Get player stats for a specific period
 */
export async function getPlayerStats(
  userId: string,
  periodType: 'day' | 'week' | 'month' | 'all_time' = 'all_time'
): Promise<PlayerStats | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching player stats:', error);
    return null;
  }

  return data;
}

/**
 * Get stats evolution over time for charts
 */
export async function getStatsEvolution(
  userId: string,
  periodType: 'week' | 'month' = 'week',
  limit: number = 12
): Promise<StatsEvolution[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('player_stats')
    .select('period_start, win_rate, elo_rating, total_matches')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .order('period_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching stats evolution:', error);
    return [];
  }

  return data.map((stat) => ({
    date: stat.period_start,
    win_rate: stat.win_rate,
    elo_rating: stat.elo_rating,
    matches_played: stat.total_matches,
  })).reverse();
}

/**
 * Calculate and store player stats for a period
 * Called by cron job or after match completion
 */
export async function calculatePlayerStats(
  userId: string,
  periodType: 'day' | 'week' | 'month' | 'all_time',
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  const supabase = await createClient();

  // Query all matches in period
  const { data: matches, error: matchError } = await supabase
    .from('match')
    .select('*, tournament_bracket!inner(tournament_id)')
    .or(`team1_player1_id.eq.${userId},team1_player2_id.eq.${userId},team2_player1_id.eq.${userId},team2_player2_id.eq.${userId}`)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString());

  if (matchError || !matches) {
    console.error('Error fetching matches for stats:', matchError);
    return;
  }

  // Calculate stats from matches
  let matchesWon = 0;
  let matchesLost = 0;
  let totalGamesWon = 0;
  let totalGamesLost = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  matches.forEach((match) => {
    const isTeam1 =
      match.team1_player1_id === userId || match.team1_player2_id === userId;
    const won = isTeam1
      ? (match.team1_score || 0) > (match.team2_score || 0)
      : (match.team2_score || 0) > (match.team1_score || 0);

    if (won) {
      matchesWon++;
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      matchesLost++;
      tempStreak = 0;
    }

    totalGamesWon += isTeam1 ? match.team1_score || 0 : match.team2_score || 0;
    totalGamesLost += isTeam1 ? match.team2_score || 0 : match.team1_score || 0;
  });

  currentStreak = tempStreak;
  const winRate =
    matches.length > 0 ? (matchesWon / matches.length) * 100 : 0;
  const avgScorePerMatch =
    matches.length > 0 ? (totalGamesWon + totalGamesLost) / matches.length : 0;
  const gamesDiff = totalGamesWon - totalGamesLost;

  // Get current ELO rating
  const { data: profile } = await supabase
    .from('user_profile')
    .select('skill_level')
    .eq('user_id', userId)
    .single();

  // Calculate ELO (simplified - should use proper ELO algorithm)
  const baseElo = 1200;
  const eloRating = baseElo + matchesWon * 20 - matchesLost * 15;

  // Get tournament stats
  const { data: tournaments } = await supabase
    .from('tournament')
    .select('id')
    .contains('registered_users', [userId]);

  const tournamentsPlayed = tournaments?.length || 0;

  // Count tournament wins
  const { data: tournamentWins } = await supabase
    .from('tournament')
    .select('id')
    .eq('winner_user_id', userId);

  const tournamentsWon = tournamentWins?.length || 0;

  // Upsert player stats
  const { error: upsertError } = await supabase
    .from('player_stats')
    .upsert({
      user_id: userId,
      period_type: periodType,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      total_matches: matches.length,
      matches_won: matchesWon,
      matches_lost: matchesLost,
      win_rate: winRate,
      total_games_won: totalGamesWon,
      total_games_lost: totalGamesLost,
      games_diff: gamesDiff,
      avg_score_per_match: avgScorePerMatch,
      current_win_streak: currentStreak,
      best_win_streak: bestStreak,
      tournaments_played: tournamentsPlayed,
      tournaments_won: tournamentsWon,
      elo_rating: eloRating,
      skill_level: profile?.skill_level || 'beginner',
      calculated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,period_type,period_start'
    });

  if (upsertError) {
    console.error('Error upserting player stats:', upsertError);
  }
}

/**
 * Compare stats between two players
 */
export async function comparePlayerStats(
  userId1: string,
  userId2: string,
  periodType: 'all_time' | 'month' = 'all_time'
): Promise<{
  player1: PlayerStats | null;
  player2: PlayerStats | null;
}> {
  const player1Stats = await getPlayerStats(userId1, periodType);
  const player2Stats = await getPlayerStats(userId2, periodType);

  return {
    player1: player1Stats,
    player2: player2Stats,
  };
}

/**
 * Get top performers for leaderboards
 */
export async function getTopPerformers(
  metric: 'elo_rating' | 'win_rate' | 'matches_won',
  limit: number = 100
): Promise<PlayerStats[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('period_type', 'all_time')
    .order(metric, { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top performers:', error);
    return [];
  }

  return data;
}
