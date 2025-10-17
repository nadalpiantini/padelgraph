/**
 * Mexicano Tournament Algorithm
 *
 * Dynamic winners/losers rotation system where:
 * - Winners play against winners
 * - Losers play against losers
 * - Pairs are formed based on current standings
 *
 * Rules:
 * - Round 1: Random initial pairings
 * - Subsequent rounds: Pair players by current ranking
 * - Top performers face each other (harder matches)
 * - Bottom performers face each other (recovery chance)
 */

import type { Match, Participant, Standing } from './types';

/**
 * Generate matches for a Mexicano round
 *
 * Algorithm:
 * 1. Round 1: Random pairings (no standings yet)
 * 2. Round 2+: Sort by standings, pair adjacent players
 *    - Best players: 1st+2nd vs 3rd+4th
 *    - Middle players: Continue pattern
 *    - Worst players: Bottom pairs play each other
 *
 * @param participants - List of checked-in participants
 * @param roundNumber - Current round number (1-indexed)
 * @param standings - Current tournament standings
 * @returns Array of match pairings
 */
export function generateMexicanoRound(
  participants: Participant[],
  roundNumber: number,
  standings: Standing[]
): Omit<Match, 'id' | 'court_id'>[] {
  const playerCount = participants.length;

  // Validate minimum players
  if (playerCount < 4) {
    throw new Error('Mexicano requires at least 4 players');
  }

  // Validate even number of players
  if (playerCount % 2 !== 0) {
    throw new Error('Mexicano requires an even number of players');
  }

  const playerIds = participants
    .filter((p) => p.status === 'checked_in')
    .map((p) => p.user_id);

  // Round 1: Random pairings (no standings data yet)
  if (roundNumber === 1) {
    return generateRandomPairings(playerIds);
  }

  // Round 2+: Standings-based pairings
  return generateStandingsBasedPairings(playerIds, standings);
}

/**
 * Generate random pairings for Round 1
 *
 * Uses Fisher-Yates shuffle to randomize player order,
 * then pairs adjacent players for initial matches.
 *
 * @param playerIds - Array of player user IDs
 * @returns Array of match pairings
 */
function generateRandomPairings(
  playerIds: string[]
): Omit<Match, 'id' | 'court_id'>[] {
  // Shuffle players randomly
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Create matches from shuffled pairs
  const matches: Omit<Match, 'id' | 'court_id'>[] = [];

  for (let i = 0; i < shuffled.length; i += 4) {
    matches.push({
      round_id: '', // Will be set by caller
      team1_player1_id: shuffled[i],
      team1_player2_id: shuffled[i + 1],
      team2_player1_id: shuffled[i + 2],
      team2_player2_id: shuffled[i + 3],
      status: 'pending',
      is_draw: false,
    });
  }

  return matches;
}

/**
 * Generate pairings based on current standings
 *
 * Algorithm:
 * 1. Sort players by points (desc), then games_diff (desc)
 * 2. Pair in sequence: [1st, 2nd] vs [3rd, 4th], etc.
 * 3. This ensures similar-skill players compete together
 *
 * @param playerIds - Array of player user IDs
 * @param standings - Current standings with points and games_diff
 * @returns Array of match pairings
 */
function generateStandingsBasedPairings(
  playerIds: string[],
  standings: Standing[]
): Omit<Match, 'id' | 'court_id'>[] {
  // Create standings map for quick lookup
  const standingsMap = new Map<string, Standing>();
  for (const standing of standings) {
    standingsMap.set(standing.user_id, standing);
  }

  // Sort players by standings (points desc, games_diff desc)
  const sortedPlayers = [...playerIds].sort((a, b) => {
    const standingA = standingsMap.get(a);
    const standingB = standingsMap.get(b);

    // If no standing exists, place at bottom
    if (!standingA) return 1;
    if (!standingB) return -1;

    // Primary sort: points (descending)
    if (standingA.points !== standingB.points) {
      return standingB.points - standingA.points;
    }

    // Secondary sort: games difference (descending)
    return standingB.games_diff - standingA.games_diff;
  });

  // Pair adjacent players by rank
  const matches: Omit<Match, 'id' | 'court_id'>[] = [];

  for (let i = 0; i < sortedPlayers.length; i += 4) {
    matches.push({
      round_id: '', // Will be set by caller
      team1_player1_id: sortedPlayers[i],
      team1_player2_id: sortedPlayers[i + 1],
      team2_player1_id: sortedPlayers[i + 2],
      team2_player2_id: sortedPlayers[i + 3],
      status: 'pending',
      is_draw: false,
    });
  }

  return matches;
}

/**
 * Validate Mexicano round generation
 *
 * @param matches - Generated matches
 * @param participants - All participants
 * @returns Validation result
 */
export function validateMexicanoRound(
  matches: Match[],
  participants: Participant[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const playerAppearances = new Map<string, number>();

  // Count player appearances
  for (const match of matches) {
    const players = [
      match.team1_player1_id,
      match.team1_player2_id,
      match.team2_player1_id,
      match.team2_player2_id,
    ];

    for (const playerId of players) {
      playerAppearances.set(playerId, (playerAppearances.get(playerId) || 0) + 1);
    }
  }

  // Validate no player plays twice
  for (const [playerId, count] of playerAppearances.entries()) {
    if (count > 1) {
      errors.push(`Player ${playerId} appears ${count} times in the same round`);
    }
  }

  // Validate all checked-in players are included
  const checkedInPlayers = participants.filter((p) => p.status === 'checked_in');
  const expectedCount = checkedInPlayers.length;
  const actualCount = playerAppearances.size;

  if (actualCount !== expectedCount) {
    errors.push(
      `Expected ${expectedCount} players but found ${actualCount} in matches`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate optimal number of rounds for Mexicano
 *
 * Mexicano typically runs 5-10 rounds depending on:
 * - Player count
 * - Time available
 * - Desired competitiveness
 *
 * @param playerCount - Number of participants
 * @returns Recommended number of rounds
 */
export function calculateOptimalRounds(playerCount: number): number {
  if (playerCount <= 8) return 5;
  if (playerCount <= 16) return 7;
  if (playerCount <= 24) return 9;
  return 10;
}
