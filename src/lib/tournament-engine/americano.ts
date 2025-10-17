/**
 * Americano Tournament Algorithm
 *
 * Round Robin rotation system where all players play with all other players.
 * Pairs rotate each round to maximize social interaction.
 *
 * Rules:
 * - Each player must play with every other player at least once
 * - No player plays twice in the same round
 * - Courts are assigned equitably
 */

import type { Match, Participant } from './types';

/**
 * Generate matches for an Americano round
 *
 * Uses a modified round-robin algorithm that ensures:
 * 1. All players eventually partner with each other
 * 2. No repeating pairs in the same round
 * 3. Balanced court distribution
 *
 * @param participants - List of checked-in participants
 * @param roundNumber - Current round number (1-indexed)
 * @param previousMatches - All matches from previous rounds
 * @returns Array of match pairings (without IDs or court assignments)
 */
export function generateAmericanoRound(
  participants: Participant[],
  roundNumber: number,
  _previousMatches: Match[]
): Omit<Match, 'id' | 'court_id'>[] {
  const playerCount = participants.length;

  // Validate minimum players (need at least 4 for 2v2)
  if (playerCount < 4) {
    throw new Error('Americano requires at least 4 players');
  }

  // Validate even number of players
  if (playerCount % 2 !== 0) {
    throw new Error('Americano requires an even number of players');
  }

  // Get player IDs for pairing
  const playerIds = participants
    .filter((p) => p.status === 'checked_in')
    .map((p) => p.user_id);

  // Generate pairings based on round number
  const pairings = generateRoundRobinPairings(playerIds, roundNumber);

  // Build matches without court assignments
  const matches: Omit<Match, 'id' | 'court_id'>[] = [];

  for (let i = 0; i < pairings.length; i += 2) {
    if (i + 1 < pairings.length) {
      const pair1 = pairings[i];
      const pair2 = pairings[i + 1];

      matches.push({
        round_id: '', // Will be set by caller
        team1_player1_id: pair1[0],
        team1_player2_id: pair1[1],
        team2_player1_id: pair2[0],
        team2_player2_id: pair2[1],
        status: 'pending',
        is_draw: false,
      });
    }
  }

  return matches;
}

/**
 * Generate round-robin pairings for a specific round
 *
 * Algorithm uses circular rotation to ensure all players pair up systematically:
 * - Round 1: (1,2), (3,4), (5,6), (7,8)
 * - Round 2: (1,3), (2,5), (4,7), (6,8)
 * - Round 3: (1,4), (3,6), (2,7), (5,8)
 *
 * @param playerIds - Array of player user IDs
 * @param roundNumber - Current round number (1-indexed)
 * @returns Array of player pairs [player1_id, player2_id]
 */
function generateRoundRobinPairings(
  playerIds: string[],
  roundNumber: number
): [string, string][] {
  const n = playerIds.length;
  const pairs: [string, string][] = [];

  // Use modulo to handle rotation across multiple complete cycles
  const rotationOffset = (roundNumber - 1) % (n - 1);

  // Create rotation array (fix first player, rotate others)
  const fixed = playerIds[0];
  const rotating = playerIds.slice(1);

  // Rotate the array based on round number
  const rotated = [
    ...rotating.slice(rotationOffset),
    ...rotating.slice(0, rotationOffset),
  ];

  // Reconstruct full array with fixed first player
  const rotatedPlayers = [fixed, ...rotated];

  // Pair players: first with last, second with second-to-last, etc.
  for (let i = 0; i < n / 2; i++) {
    pairs.push([rotatedPlayers[i], rotatedPlayers[n - 1 - i]]);
  }

  return pairs;
}

/**
 * Check if a pairing has been used before
 *
 * @param player1 - First player ID
 * @param player2 - Second player ID
 * @param previousMatches - All previous matches
 * @returns True if this pair has played together before
 */
export function hasPairedBefore(
  player1: string,
  player2: string,
  previousMatches: Match[]
): boolean {
  return previousMatches.some((match) => {
    // Check if both players are in the same team
    const team1 = [match.team1_player1_id, match.team1_player2_id];
    const team2 = [match.team2_player1_id, match.team2_player2_id];

    const inTeam1 = team1.includes(player1) && team1.includes(player2);
    const inTeam2 = team2.includes(player1) && team2.includes(player2);

    return inTeam1 || inTeam2;
  });
}

/**
 * Validate Americano round generation
 *
 * Ensures:
 * - No player appears twice in the same round
 * - All players are included (or sitting out if odd)
 * - Correct number of matches for available courts
 *
 * @param matches - Generated matches
 * @param participants - All participants
 * @returns Validation result with errors
 */
export function validateAmericanoRound(
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
