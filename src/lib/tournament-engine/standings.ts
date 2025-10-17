/**
 * Tournament Standings Calculator
 *
 * Calculates and updates player standings based on match results.
 * Handles point allocation, ranking, and tiebreakers.
 */

import type { Match, Standing, TournamentConfig } from './types';

/**
 * Calculate standings from match results
 *
 * Algorithm:
 * 1. Process all completed matches
 * 2. Award points based on win/draw/loss
 * 3. Calculate games won/lost and difference
 * 4. Sort by points (desc) → games_diff (desc) → games_won (desc)
 * 5. Assign ranks
 *
 * @param tournamentId - Tournament ID
 * @param matches - All tournament matches
 * @param config - Tournament configuration (points rules)
 * @returns Updated standings for all participants
 */
export function calculateStandings(
  tournamentId: string,
  matches: Match[],
  config: TournamentConfig
): Standing[] {
  const standingsMap = new Map<string, Standing>();

  // Initialize standings for all players
  const allPlayerIds = new Set<string>();
  for (const match of matches) {
    allPlayerIds.add(match.team1_player1_id);
    allPlayerIds.add(match.team1_player2_id);
    allPlayerIds.add(match.team2_player1_id);
    allPlayerIds.add(match.team2_player2_id);
  }

  for (const playerId of allPlayerIds) {
    standingsMap.set(playerId, {
      tournament_id: tournamentId,
      user_id: playerId,
      matches_played: 0,
      matches_won: 0,
      matches_drawn: 0,
      matches_lost: 0,
      games_won: 0,
      games_lost: 0,
      games_diff: 0,
      points: 0,
    });
  }

  // Process completed matches
  const completedMatches = matches.filter((m) => m.status === 'completed');

  for (const match of completedMatches) {
    if (match.team1_score === undefined || match.team2_score === undefined) {
      continue; // Skip if scores not set
    }

    const team1Players = [match.team1_player1_id, match.team1_player2_id];
    const team2Players = [match.team2_player1_id, match.team2_player2_id];

    // Determine match outcome
    const isDraw = match.is_draw || match.team1_score === match.team2_score;
    const team1Wins = !isDraw && (match.winner_team === 1 || match.team1_score > match.team2_score);
    const team2Wins = !isDraw && (match.winner_team === 2 || match.team2_score > match.team1_score);

    // Update standings for Team 1 players
    for (const playerId of team1Players) {
      const standing = standingsMap.get(playerId)!;
      standing.matches_played += 1;
      standing.games_won += match.team1_score;
      standing.games_lost += match.team2_score;

      if (isDraw) {
        standing.matches_drawn += 1;
        standing.points += config.points_per_draw;
      } else if (team1Wins) {
        standing.matches_won += 1;
        standing.points += config.points_per_win;
      } else {
        standing.matches_lost += 1;
        standing.points += config.points_per_loss;
      }

      standing.games_diff = standing.games_won - standing.games_lost;
    }

    // Update standings for Team 2 players
    for (const playerId of team2Players) {
      const standing = standingsMap.get(playerId)!;
      standing.matches_played += 1;
      standing.games_won += match.team2_score;
      standing.games_lost += match.team1_score;

      if (isDraw) {
        standing.matches_drawn += 1;
        standing.points += config.points_per_draw;
      } else if (team2Wins) {
        standing.matches_won += 1;
        standing.points += config.points_per_win;
      } else {
        standing.matches_lost += 1;
        standing.points += config.points_per_loss;
      }

      standing.games_diff = standing.games_won - standing.games_lost;
    }
  }

  // Convert to array and sort
  const standings = Array.from(standingsMap.values());
  standings.sort(compareStandings);

  // Assign ranks
  for (let i = 0; i < standings.length; i++) {
    standings[i].rank = i + 1;
  }

  return standings;
}

/**
 * Compare two standings for sorting
 *
 * Tiebreaker rules:
 * 1. Points (higher is better)
 * 2. Games difference (higher is better)
 * 3. Games won (higher is better)
 * 4. Matches won (higher is better)
 *
 * @param a - First standing
 * @param b - Second standing
 * @returns Comparison result for sorting
 */
function compareStandings(a: Standing, b: Standing): number {
  // Primary: Points (descending)
  if (a.points !== b.points) {
    return b.points - a.points;
  }

  // Secondary: Games difference (descending)
  if (a.games_diff !== b.games_diff) {
    return b.games_diff - a.games_diff;
  }

  // Tertiary: Games won (descending)
  if (a.games_won !== b.games_won) {
    return b.games_won - a.games_won;
  }

  // Quaternary: Matches won (descending)
  return b.matches_won - a.matches_won;
}

/**
 * Update single match result in standings
 *
 * Incremental update for real-time standings without full recalculation.
 * Used when a single match score is submitted.
 *
 * @param match - Completed match with scores
 * @param currentStandings - Current standings
 * @param config - Tournament configuration
 * @returns Updated standings
 */
export function updateStandingsForMatch(
  match: Match,
  currentStandings: Standing[],
  config: TournamentConfig
): Standing[] {
  if (match.team1_score === undefined || match.team2_score === undefined) {
    throw new Error('Match must have scores to update standings');
  }

  const standingsMap = new Map(
    currentStandings.map((s) => [s.user_id, { ...s }])
  );

  const team1Players = [match.team1_player1_id, match.team1_player2_id];
  const team2Players = [match.team2_player1_id, match.team2_player2_id];

  const isDraw = match.is_draw || match.team1_score === match.team2_score;
  const team1Wins = !isDraw && (match.winner_team === 1 || match.team1_score > match.team2_score);

  // Update Team 1 players
  for (const playerId of team1Players) {
    const standing = standingsMap.get(playerId);
    if (!standing) continue;

    standing.matches_played += 1;
    standing.games_won += match.team1_score;
    standing.games_lost += match.team2_score;
    standing.games_diff = standing.games_won - standing.games_lost;

    if (isDraw) {
      standing.matches_drawn += 1;
      standing.points += config.points_per_draw;
    } else if (team1Wins) {
      standing.matches_won += 1;
      standing.points += config.points_per_win;
    } else {
      standing.matches_lost += 1;
      standing.points += config.points_per_loss;
    }
  }

  // Update Team 2 players
  for (const playerId of team2Players) {
    const standing = standingsMap.get(playerId);
    if (!standing) continue;

    standing.matches_played += 1;
    standing.games_won += match.team2_score;
    standing.games_lost += match.team1_score;
    standing.games_diff = standing.games_won - standing.games_lost;

    if (isDraw) {
      standing.matches_drawn += 1;
      standing.points += config.points_per_draw;
    } else if (!team1Wins) {
      standing.matches_won += 1;
      standing.points += config.points_per_win;
    } else {
      standing.matches_lost += 1;
      standing.points += config.points_per_loss;
    }
  }

  // Re-sort and re-rank
  const updated = Array.from(standingsMap.values());
  updated.sort(compareStandings);

  for (let i = 0; i < updated.length; i++) {
    updated[i].rank = i + 1;
  }

  return updated;
}

/**
 * Get top N players from standings
 *
 * @param standings - Current standings
 * @param count - Number of top players to return
 * @returns Top N players sorted by rank
 */
export function getTopPlayers(standings: Standing[], count: number): Standing[] {
  return standings.slice(0, Math.min(count, standings.length));
}

/**
 * Get player's current rank
 *
 * @param userId - Player user ID
 * @param standings - Current standings
 * @returns Player's rank or undefined if not found
 */
export function getPlayerRank(userId: string, standings: Standing[]): number | undefined {
  const standing = standings.find((s) => s.user_id === userId);
  return standing?.rank;
}

/**
 * Check if tournament is complete
 *
 * A tournament is complete when all matches are finished.
 *
 * @param matches - All tournament matches
 * @returns True if all matches are completed
 */
export function isTournamentComplete(matches: Match[]): boolean {
  return matches.length > 0 && matches.every((m) => m.status === 'completed');
}
