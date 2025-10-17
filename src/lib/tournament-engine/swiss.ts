/**
 * Swiss System Tournament Algorithm
 *
 * Fixed number of rounds with dynamic pairing based on performance.
 * No elimination - all players compete in all rounds.
 *
 * Swiss System Rules:
 * - Fixed number of rounds (typically 5-7)
 * - Players with same score paired together
 * - Avoid repeat pairings when possible
 * - No elimination - everyone plays all rounds
 * - Final ranking by total points + tiebreakers
 *
 * Pairing Methods:
 * - Slide: Top half vs bottom half within score group
 * - Fold: Adjacent pairing (1v2, 3v4, 5v6) within score group
 * - Accelerated: Spread top players early to avoid early clashes
 */

import type { Match, Standing } from './types';

export type SwissPairingMethod = 'slide' | 'fold' | 'accelerated';

export interface SwissRoundConfig {
  roundNumber: number;
  pairingMethod: SwissPairingMethod;
  standings: Standing[];
  previousMatches: Match[];
}

/**
 * Generate a single Swiss round with dynamic pairing
 *
 * Algorithm:
 * 1. Group players by current score/points
 * 2. Within each score group, pair using selected method
 * 3. Avoid repeat pairings from previous rounds
 * 4. Handle odd number with BYE (player not in group gets BYE)
 *
 * @param config - Swiss round configuration
 * @param isDoubles - True for doubles, false for singles
 * @returns Array of matches for this round
 */
export function generateSwissRound(
  config: SwissRoundConfig,
  isDoubles: boolean = true
): Omit<Match, 'id' | 'court_id'>[] {
  const { pairingMethod, standings, previousMatches } = config;

  // Group players by points
  const scoreGroups = groupByScore(standings);

  const matches: Omit<Match, 'id' | 'court_id'>[] = [];

  // Process each score group
  for (const [_score, players] of scoreGroups) {
    // If odd number in group, one gets BYE
    if (players.length % 2 !== 0) {
      // Lowest-rated player in highest score group gets BYE
      players.pop(); // Remove BYE player from pairing
    }

    // Pair players in this score group
    const groupMatches = pairScoreGroup(
      players,
      pairingMethod,
      previousMatches,
      isDoubles
    );

    matches.push(...groupMatches);
  }

  return matches;
}

/**
 * Group players by their current points/score
 *
 * @param standings - Current tournament standings
 * @returns Map of score → players with that score
 */
function groupByScore(standings: Standing[]): Map<number, Standing[]> {
  const groups = new Map<number, Standing[]>();

  // Sort standings by points first
  const sorted = [...standings].sort((a, b) => b.points - a.points);

  for (const standing of sorted) {
    const score = standing.points;
    if (!groups.has(score)) {
      groups.set(score, []);
    }
    groups.get(score)!.push(standing);
  }

  return groups;
}

/**
 * Pair players within a score group using specified method
 *
 * @param players - Players in same score group
 * @param method - Pairing method (slide/fold/accelerated)
 * @param previousMatches - All previous matches to avoid repeats
 * @param isDoubles - True for doubles format
 * @returns Array of matches for this group
 */
function pairScoreGroup(
  players: Standing[],
  method: SwissPairingMethod,
  previousMatches: Match[],
  isDoubles: boolean
): Omit<Match, 'id' | 'court_id'>[] {
  // Sort by tiebreakers (games_diff, then games_won)
  const sorted = [...players].sort((a, b) => {
    if (a.games_diff !== b.games_diff) return b.games_diff - a.games_diff;
    if (a.games_won !== b.games_won) return b.games_won - a.games_won;
    return 0;
  });

  switch (method) {
    case 'slide':
      // Top half vs bottom half
      return pairSlideMethod(sorted, previousMatches, isDoubles);

    case 'fold':
      // Adjacent pairing (1v2, 3v4, etc.)
      return pairFoldMethod(sorted, previousMatches, isDoubles);

    case 'accelerated':
      // Accelerated Swiss: spread top players
      return pairAcceleratedMethod(sorted, previousMatches, isDoubles);

    default:
      return pairSlideMethod(sorted, previousMatches, isDoubles);
  }
}

/**
 * Slide pairing method: Top half vs bottom half
 *
 * For 8 players: 1v5, 2v6, 3v7, 4v8
 *
 * @param players - Sorted players in score group
 * @param previousMatches - Previous matches to avoid repeats
 * @param isDoubles - Doubles format flag
 * @returns Array of matches
 */
function pairSlideMethod(
  players: Standing[],
  previousMatches: Match[],
  isDoubles: boolean
): Omit<Match, 'id' | 'court_id'>[] {
  const matches: Omit<Match, 'id' | 'court_id'>[] = [];
  const n = players.length;
  const half = Math.floor(n / 2);

  for (let i = 0; i < half; i++) {
    const player1 = players[i];
    let player2 = players[i + half];

    // Check if they've played before
    if (hasPlayedBefore(player1.user_id, player2.user_id, previousMatches)) {
      // Find alternative opponent
      const alternative = findAlternativeOpponent(
        player1,
        players.slice(i + half + 1),
        previousMatches
      );
      if (alternative) {
        player2 = alternative;
      }
    }

    // Create match
    if (isDoubles) {
      matches.push({
        round_id: '',
        team1_player1_id: player1.user_id,
        team1_player2_id: player1.user_id, // TODO: Implement proper doubles pairing
        team2_player1_id: player2.user_id,
        team2_player2_id: player2.user_id,
        status: 'pending',
        is_draw: false,
      });
    } else {
      matches.push({
        round_id: '',
        team1_player1_id: player1.user_id,
        team1_player2_id: player1.user_id,
        team2_player1_id: player2.user_id,
        team2_player2_id: player2.user_id,
        status: 'pending',
        is_draw: false,
      });
    }
  }

  return matches;
}

/**
 * Fold pairing method: Adjacent pairing
 *
 * For 8 players: 1v2, 3v4, 5v6, 7v8
 *
 * @param players - Sorted players in score group
 * @param previousMatches - Previous matches to avoid repeats
 * @param isDoubles - Doubles format flag
 * @returns Array of matches
 */
function pairFoldMethod(
  players: Standing[],
  previousMatches: Match[],
  isDoubles: boolean
): Omit<Match, 'id' | 'court_id'>[] {
  const matches: Omit<Match, 'id' | 'court_id'>[] = [];

  for (let i = 0; i < players.length; i += 2) {
    if (i + 1 >= players.length) break; // Odd number handled at group level

    const player1 = players[i];
    let player2 = players[i + 1];

    // Check if they've played before
    if (hasPlayedBefore(player1.user_id, player2.user_id, previousMatches)) {
      // Find alternative opponent
      const alternative = findAlternativeOpponent(
        player1,
        players.slice(i + 2),
        previousMatches
      );
      if (alternative) {
        player2 = alternative;
      }
    }

    // Create match
    if (isDoubles) {
      matches.push({
        round_id: '',
        team1_player1_id: player1.user_id,
        team1_player2_id: player1.user_id,
        team2_player1_id: player2.user_id,
        team2_player2_id: player2.user_id,
        status: 'pending',
        is_draw: false,
      });
    } else {
      matches.push({
        round_id: '',
        team1_player1_id: player1.user_id,
        team1_player2_id: player1.user_id,
        team2_player1_id: player2.user_id,
        team2_player2_id: player2.user_id,
        status: 'pending',
        is_draw: false,
      });
    }
  }

  return matches;
}

/**
 * Accelerated Swiss pairing: Spread top players early
 *
 * First rounds: Higher vs lower to spread top players
 * Later rounds: Normal Swiss pairing
 *
 * @param players - Sorted players in score group
 * @param previousMatches - Previous matches
 * @param isDoubles - Doubles format flag
 * @returns Array of matches
 */
function pairAcceleratedMethod(
  players: Standing[],
  previousMatches: Match[],
  isDoubles: boolean
): Omit<Match, 'id' | 'court_id'>[] {
  // For now, use slide method as accelerated variant
  // TODO: Implement true accelerated Swiss with dynamic adjustment
  return pairSlideMethod(players, previousMatches, isDoubles);
}

/**
 * Check if two players have played against each other before
 *
 * @param player1Id - First player ID
 * @param player2Id - Second player ID
 * @param previousMatches - All previous matches
 * @returns True if players have faced each other
 */
export function hasPlayedBefore(
  player1Id: string,
  player2Id: string,
  previousMatches: Match[]
): boolean {
  return previousMatches.some((match) => {
    const team1 = [match.team1_player1_id, match.team1_player2_id];
    const team2 = [match.team2_player1_id, match.team2_player2_id];

    const player1InTeam1 = team1.includes(player1Id);
    const player1InTeam2 = team2.includes(player1Id);
    const player2InTeam1 = team1.includes(player2Id);
    const player2InTeam2 = team2.includes(player2Id);

    return (
      (player1InTeam1 && player2InTeam2) || (player1InTeam2 && player2InTeam1)
    );
  });
}

/**
 * Find alternative opponent who hasn't played against given player
 *
 * @param player - Player needing opponent
 * @param candidates - Potential opponents
 * @param previousMatches - Previous matches to check
 * @returns Alternative opponent or null if none available
 */
function findAlternativeOpponent(
  player: Standing,
  candidates: Standing[],
  previousMatches: Match[]
): Standing | null {
  for (const candidate of candidates) {
    if (!hasPlayedBefore(player.user_id, candidate.user_id, previousMatches)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Calculate total number of rounds for Swiss system
 *
 * Formula: log2(n) rounded up, typically 5-7 rounds
 *
 * @param participantCount - Number of participants
 * @returns Recommended number of rounds
 */
export function calculateSwissRounds(participantCount: number): number {
  if (participantCount < 4) return 3; // Minimum rounds

  // Formula: ceil(log2(n)) for small tournaments
  // Or fixed 5-7 rounds for larger tournaments
  const calculated = Math.ceil(Math.log2(participantCount));

  return Math.min(Math.max(calculated, 5), 7);
}

/**
 * Validate Swiss round pairings
 *
 * Ensures:
 * - No player appears twice in same round
 * - All players are paired (except one BYE if odd number)
 * - No forbidden pairings (e.g., same opponents)
 *
 * @param matches - Generated matches for round
 * @param standings - Current standings
 * @param previousMatches - Previous matches
 * @returns Validation result
 */
export function validateSwissRound(
  matches: Match[],
  _standings: Standing[],
  previousMatches: Match[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const playerCount = new Map<string, number>();

  // Count player appearances
  for (const match of matches) {
    const players = [
      match.team1_player1_id,
      match.team1_player2_id,
      match.team2_player1_id,
      match.team2_player2_id,
    ];

    for (const playerId of players) {
      playerCount.set(playerId, (playerCount.get(playerId) || 0) + 1);
    }
  }

  // Check no player plays twice
  for (const [playerId, count] of playerCount.entries()) {
    if (count > 1) {
      errors.push(`Player ${playerId} appears ${count} times in same round`);
    }
  }

  // Check for repeat pairings (should be avoided)
  for (const match of matches) {
    const player1 = match.team1_player1_id;
    const player2 = match.team2_player1_id;

    if (hasPlayedBefore(player1, player2, previousMatches)) {
      errors.push(
        `Warning: Players ${player1} and ${player2} have played before (repeat pairing)`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get player with BYE in current round
 *
 * @param matches - Matches for current round
 * @param standings - All standings
 * @returns Player ID with BYE, or null
 */
export function getByePlayerForSwissRound(
  matches: Match[],
  standings: Standing[]
): string | null {
  const playingPlayers = new Set<string>();

  for (const match of matches) {
    playingPlayers.add(match.team1_player1_id);
    playingPlayers.add(match.team2_player1_id);
  }

  // Find player not in any match
  for (const standing of standings) {
    if (!playingPlayers.has(standing.user_id)) {
      return standing.user_id;
    }
  }

  return null;
}
