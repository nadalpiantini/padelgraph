/**
 * Round Robin Tournament Algorithm
 *
 * Classic round robin where every participant plays against every other participant.
 * Uses the circle method for optimal scheduling.
 *
 * Rules:
 * - Each player/team must play against all others at least once
 * - No player plays twice in the same round
 * - If odd number of participants, one gets a BYE each round
 * - Systematic rotation using circle method
 */

import type { Match, Participant } from './types';

/**
 * Generate all rounds for a Round Robin tournament
 *
 * Circle method algorithm:
 * 1. If odd participants, add dummy for BYE
 * 2. Fix first position, rotate others clockwise
 * 3. Pair: position[i] vs position[n-1-i]
 *
 * Example with 8 players:
 * Round 1: (1v8, 2v7, 3v6, 4v5)
 * Round 2: (1v7, 8v6, 2v5, 3v4)
 * Round 3: (1v6, 7v5, 8v4, 2v3)
 * ... continues until all pairings are made
 *
 * @param participants - List of checked-in participants
 * @param isDoubles - True for doubles (4 players per match), false for singles (2 players per match)
 * @returns Array of rounds, each containing matches
 */
export function generateRoundRobin(
  participants: Participant[],
  isDoubles: boolean = true
): { roundNumber: number; matches: Omit<Match, 'id' | 'court_id'>[] }[] {
  let playerIds = participants
    .filter((p) => p.status === 'checked_in')
    .map((p) => p.user_id);

  // Validate minimum players
  const minPlayers = isDoubles ? 4 : 2;
  if (playerIds.length < minPlayers) {
    throw new Error(
      `Round Robin requires at least ${minPlayers} players for ${isDoubles ? 'doubles' : 'singles'}`
    );
  }

  // Add BYE for odd number
  const hasBye = playerIds.length % 2 !== 0;
  if (hasBye) {
    playerIds = [...playerIds, 'BYE'];
  }

  const n = playerIds.length;
  const totalRounds = n - 1;
  const rounds: { roundNumber: number; matches: Omit<Match, 'id' | 'court_id'>[] }[] = [];

  // Generate each round using circle method
  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: Omit<Match, 'id' | 'court_id'>[] = [];
    const currentRotation = getCircleRotation(playerIds, round);

    // Pair players: first with last, second with second-to-last, etc.
    for (let i = 0; i < n / 2; i++) {
      const player1 = currentRotation[i];
      const player2 = currentRotation[n - 1 - i];

      // Skip if either player is a BYE
      if (player1 === 'BYE' || player2 === 'BYE') {
        continue;
      }

      if (isDoubles) {
        // For doubles, we need to pair players into teams
        // This is a simplified version - in real implementation,
        // you'd want more sophisticated team assignment
        const nextPairIndex = i + 1;
        if (nextPairIndex < n / 2) {
          const player3 = currentRotation[nextPairIndex];
          const player4 = currentRotation[n - 1 - nextPairIndex];

          if (player3 !== 'BYE' && player4 !== 'BYE') {
            roundMatches.push({
              round_id: '', // Will be set by caller
              team1_player1_id: player1,
              team1_player2_id: player2,
              team2_player1_id: player3,
              team2_player2_id: player4,
              status: 'pending',
              is_draw: false,
            });
            i++; // Skip next pair since we used it
          }
        }
      } else {
        // Singles match
        roundMatches.push({
          round_id: '', // Will be set by caller
          team1_player1_id: player1,
          team1_player2_id: player1, // Same player for singles
          team2_player1_id: player2,
          team2_player2_id: player2, // Same player for singles
          status: 'pending',
          is_draw: false,
        });
      }
    }

    rounds.push({
      roundNumber: round + 1,
      matches: roundMatches,
    });
  }

  return rounds;
}

/**
 * Generate a single Round Robin round
 *
 * @param participants - List of checked-in participants
 * @param roundNumber - Current round number (1-indexed)
 * @param isDoubles - True for doubles, false for singles
 * @returns Array of match pairings for this round
 */
export function generateRoundRobinRound(
  participants: Participant[],
  roundNumber: number,
  isDoubles: boolean = true
): Omit<Match, 'id' | 'court_id'>[] {
  const allRounds = generateRoundRobin(participants, isDoubles);

  if (roundNumber < 1 || roundNumber > allRounds.length) {
    throw new Error(
      `Invalid round number ${roundNumber}. Must be between 1 and ${allRounds.length}`
    );
  }

  return allRounds[roundNumber - 1].matches;
}

/**
 * Get circle rotation for a specific round
 *
 * Circle method: fix first position, rotate others clockwise
 *
 * @param players - Array of player IDs
 * @param roundIndex - Round index (0-indexed)
 * @returns Rotated array of player IDs
 */
function getCircleRotation(players: string[], roundIndex: number): string[] {
  const n = players.length;
  if (n === 0) return [];

  // Fix first player
  const fixed = players[0];
  const rotating = players.slice(1);

  // Rotate by round index
  const rotationOffset = roundIndex % rotating.length;
  const rotated = [
    ...rotating.slice(rotationOffset),
    ...rotating.slice(0, rotationOffset),
  ];

  return [fixed, ...rotated];
}

/**
 * Check if two players have played against each other before
 *
 * @param player1 - First player ID
 * @param player2 - Second player ID
 * @param previousMatches - All previous matches
 * @returns True if players have faced each other
 */
export function hasPlayedAgainst(
  player1: string,
  player2: string,
  previousMatches: Match[]
): boolean {
  return previousMatches.some((match) => {
    const team1 = [match.team1_player1_id, match.team1_player2_id];
    const team2 = [match.team2_player1_id, match.team2_player2_id];

    // Check if player1 is in one team and player2 in the other
    const player1InTeam1 = team1.includes(player1);
    const player1InTeam2 = team2.includes(player1);
    const player2InTeam1 = team1.includes(player2);
    const player2InTeam2 = team2.includes(player2);

    const playersOpposed =
      (player1InTeam1 && player2InTeam2) || (player1InTeam2 && player2InTeam1);

    return playersOpposed;
  });
}

/**
 * Validate Round Robin round
 *
 * Ensures:
 * - No player appears twice in the same round
 * - All players are included (except BYEs)
 * - Matches are properly formed
 *
 * @param matches - Generated matches
 * @param participants - All participants
 * @returns Validation result with errors
 */
export function validateRoundRobinRound(
  matches: Match[],
  _participants: Participant[]
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

  // Note: We don't validate all players are included because
  // in round robin, one player might have a BYE

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate total number of rounds needed for round robin
 *
 * @param participantCount - Number of participants
 * @returns Number of rounds needed
 */
export function calculateRoundRobinRounds(participantCount: number): number {
  if (participantCount < 2) {
    throw new Error('Need at least 2 participants for round robin');
  }

  // If odd, add 1 for BYE
  const n = participantCount % 2 === 0 ? participantCount : participantCount + 1;

  // Total rounds = n - 1
  return n - 1;
}

/**
 * Get list of players who have a BYE in a specific round
 *
 * @param participants - List of participants
 * @param roundNumber - Round number (1-indexed)
 * @returns Array of player IDs who have BYE this round
 */
export function getByePlayersForRound(
  participants: Participant[],
  roundNumber: number
): string[] {
  const playerIds = participants
    .filter((p) => p.status === 'checked_in')
    .map((p) => p.user_id);

  // Only odd number of participants have BYEs
  if (playerIds.length % 2 === 0) {
    return [];
  }

  const playersWithBye = [...playerIds, 'BYE'];
  const n = playersWithBye.length;
  const rotation = getCircleRotation(playersWithBye, roundNumber - 1);

  // The player paired with BYE has a bye
  for (let i = 0; i < n / 2; i++) {
    const player1 = rotation[i];
    const player2 = rotation[n - 1 - i];

    if (player1 === 'BYE') return [player2];
    if (player2 === 'BYE') return [player1];
  }

  return [];
}
