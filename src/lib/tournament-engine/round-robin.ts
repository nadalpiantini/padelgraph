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

/**
 * Generate Round Robin with groups and playoffs
 *
 * Tournament Structure:
 * - Phase 1: Multiple groups play round robin independently
 * - Phase 2: Top N from each group advance to knockout playoffs
 *
 * @param participants - All tournament participants
 * @param groupCount - Number of groups (2-4 typical)
 * @param topPerGroup - How many advance from each group
 * @param isDoubles - Doubles format flag
 * @returns Group stage rounds + playoff bracket structure
 */
export function generateRoundRobinWithGroups(
  participants: Participant[],
  groupCount: number = 2,
  topPerGroup: number = 2,
  isDoubles: boolean = true
): {
  groups: {
    groupName: string;
    groupNumber: number;
    participants: Participant[];
    rounds: { roundNumber: number; matches: Omit<Match, 'id' | 'court_id'>[] }[];
  }[];
  playoffBracketSize: number;
} {
  if (groupCount < 2 || groupCount > 8) {
    throw new Error('Group count must be between 2 and 8');
  }

  const checkedIn = participants.filter((p) => p.status === 'checked_in');

  if (checkedIn.length < groupCount * 2) {
    throw new Error(`Need at least ${groupCount * 2} players for ${groupCount} groups`);
  }

  // Divide participants into groups
  const groupedParticipants = divideIntoGroups(checkedIn, groupCount);

  // Generate round robin for each group
  const groups = groupedParticipants.map((groupParticipants, index) => ({
    groupName: String.fromCharCode(65 + index), // A, B, C, etc.
    groupNumber: index + 1,
    participants: groupParticipants,
    rounds: generateRoundRobin(groupParticipants, isDoubles),
  }));

  // Calculate playoff bracket size (topPerGroup × groupCount)
  const playoffBracketSize = topPerGroup * groupCount;

  return {
    groups,
    playoffBracketSize,
  };
}

/**
 * Divide participants into balanced groups
 *
 * Uses snake draft method to ensure balanced groups:
 * Group A: 1, 4, 5, 8, 9...
 * Group B: 2, 3, 6, 7, 10...
 *
 * @param participants - All participants
 * @param groupCount - Number of groups
 * @returns Array of participant arrays (one per group)
 */
function divideIntoGroups(
  participants: Participant[],
  groupCount: number
): Participant[][] {
  const groups: Participant[][] = Array.from({ length: groupCount }, () => []);

  // Snake draft: 1→2→3, then 3→2→1, repeat
  let currentGroup = 0;
  let direction = 1; // 1 = forward, -1 = backward

  for (const participant of participants) {
    groups[currentGroup].push(participant);

    currentGroup += direction;

    // Reverse direction at boundaries
    if (currentGroup >= groupCount) {
      currentGroup = groupCount - 1;
      direction = -1;
    } else if (currentGroup < 0) {
      currentGroup = 0;
      direction = 1;
    }
  }

  return groups;
}

/**
 * Get group standings from match results
 *
 * @param groupMatches - All matches for a specific group
 * @param participants - Participants in this group
 * @returns Standings sorted by points/tiebreakers
 */
export function getGroupStandings(
  groupMatches: Match[],
  participants: Participant[]
): {
  user_id: string;
  points: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  games_won: number;
  games_lost: number;
  games_diff: number;
}[] {
  const standings = new Map(
    participants.map((p) => [
      p.user_id,
      {
        user_id: p.user_id,
        points: 0,
        matches_won: 0,
        matches_drawn: 0,
        matches_lost: 0,
        games_won: 0,
        games_lost: 0,
        games_diff: 0,
      },
    ])
  );

  // Process completed matches (simplified - assumes win = 3 pts, draw = 1 pt)
  const completed = groupMatches.filter((m) => m.status === 'completed');

  for (const match of completed) {
    if (match.team1_score === undefined || match.team2_score === undefined) continue;

    const team1Players = [match.team1_player1_id, match.team1_player2_id];
    const team2Players = [match.team2_player1_id, match.team2_player2_id];

    const isDraw = match.is_draw || match.team1_score === match.team2_score;
    const team1Wins = !isDraw && (match.winner_team === 1 || match.team1_score > match.team2_score);

    // Update Team 1
    for (const playerId of team1Players) {
      const standing = standings.get(playerId);
      if (!standing) continue;

      standing.games_won += match.team1_score;
      standing.games_lost += match.team2_score;
      standing.games_diff = standing.games_won - standing.games_lost;

      if (isDraw) {
        standing.matches_drawn += 1;
        standing.points += 1;
      } else if (team1Wins) {
        standing.matches_won += 1;
        standing.points += 3;
      } else {
        standing.matches_lost += 1;
      }
    }

    // Update Team 2
    for (const playerId of team2Players) {
      const standing = standings.get(playerId);
      if (!standing) continue;

      standing.games_won += match.team2_score;
      standing.games_lost += match.team1_score;
      standing.games_diff = standing.games_won - standing.games_lost;

      if (isDraw) {
        standing.matches_drawn += 1;
        standing.points += 1;
      } else if (!team1Wins) {
        standing.matches_won += 1;
        standing.points += 3;
      } else {
        standing.matches_lost += 1;
      }
    }
  }

  // Sort by points → games_diff → games_won
  const sorted = Array.from(standings.values()).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.games_diff !== b.games_diff) return b.games_diff - a.games_diff;
    return b.games_won - a.games_won;
  });

  return sorted;
}

/**
 * Get top qualifiers from each group
 *
 * @param groupStandings - Standings for each group
 * @param topPerGroup - How many qualify from each group
 * @returns Qualified participants with their group and rank
 */
export function getQualifiersFromGroups(
  groupStandings: Map<
    string,
    {
      user_id: string;
      points: number;
      games_diff: number;
      games_won: number;
    }[]
  >,
  topPerGroup: number
): {
  user_id: string;
  group: string;
  groupRank: number;
  points: number;
}[] {
  const qualifiers: {
    user_id: string;
    group: string;
    groupRank: number;
    points: number;
  }[] = [];

  for (const [groupName, standings] of groupStandings.entries()) {
    const topN = standings.slice(0, topPerGroup);

    topN.forEach((standing, index) => {
      qualifiers.push({
        user_id: standing.user_id,
        group: groupName,
        groupRank: index + 1,
        points: standing.points,
      });
    });
  }

  return qualifiers;
}
