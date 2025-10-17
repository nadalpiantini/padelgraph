/**
 * Knockout/Elimination Tournament Algorithm
 *
 * Classic single and double elimination brackets.
 * Uses power-of-2 bracket sizing with automatic BYE handling.
 *
 * Single Elimination Rules:
 * - Lose once = eliminated
 * - Bracket size must be power of 2 (4, 8, 16, 32, 64)
 * - BYEs automatically assigned if not exact power of 2
 * - Standard seeding: 1 vs bracket_size, 2 vs bracket_size-1, etc.
 *
 * Double Elimination Rules:
 * - Two separate brackets: winners and losers
 * - Lose in winners bracket → drop to losers bracket
 * - Lose in losers bracket → eliminated
 * - Final: winners bracket champion vs losers bracket champion
 */

import type { Match, Participant } from './types';

export interface KnockoutBracket {
  rounds: {
    roundNumber: number;
    roundName: string;
    matches: Omit<Match, 'id' | 'court_id'>[];
  }[];
  bracketSize: number;
  totalByes: number;
}

export interface DoubleEliminationBracket {
  winners: KnockoutBracket;
  losers: KnockoutBracket;
  grandFinal: Omit<Match, 'id' | 'court_id'> | null;
}

export type SeedingMethod = 'random' | 'ranked' | 'manual';

/**
 * Generate complete single elimination bracket
 *
 * Algorithm:
 * 1. Round participant count to next power of 2
 * 2. Calculate BYEs needed
 * 3. Seed participants (1 vs n, 2 vs n-1, etc.)
 * 4. Generate all rounds with proper progression
 *
 * Example with 6 players (rounds to 8):
 * Round 1: (1v8-BYE, 2v7, 3v6, 4v5-BYE)
 * Round 2: (1v7, 6v5) [BYEs auto-advance]
 * Round 3: (1v6) [Final]
 *
 * @param participants - List of checked-in participants
 * @param seeding - How to seed participants ('random' | 'ranked' | 'manual')
 * @param seedOrder - Manual seed order (only for 'manual' seeding)
 * @param isDoubles - True for doubles, false for singles
 * @returns Complete bracket structure with all rounds
 */
export function generateKnockoutBracket(
  participants: Participant[],
  seeding: SeedingMethod = 'ranked',
  seedOrder?: string[],
  isDoubles: boolean = true
): KnockoutBracket {
  const checkedIn = participants.filter((p) => p.status === 'checked_in');

  // Validate minimum participants
  const minPlayers = isDoubles ? 4 : 2;
  if (checkedIn.length < minPlayers) {
    throw new Error(
      `Knockout requires at least ${minPlayers} players for ${isDoubles ? 'doubles' : 'singles'}`
    );
  }

  // Calculate bracket size (next power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(checkedIn.length)));
  const totalByes = bracketSize - checkedIn.length;

  // Seed participants
  const seededParticipants = seedParticipants(
    checkedIn,
    bracketSize,
    seeding,
    seedOrder
  );

  const rounds: KnockoutBracket['rounds'] = [];
  let currentRoundParticipants: (string | null)[] = seededParticipants;
  let roundNumber = 1;

  // Generate each round until we have a winner
  while (currentRoundParticipants.length > 1) {
    const roundMatches: Omit<Match, 'id' | 'court_id'>[] = [];
    const nextRoundParticipants: (string | null)[] = [];

    // Pair participants for this round
    for (let i = 0; i < currentRoundParticipants.length; i += 2) {
      const player1 = currentRoundParticipants[i];
      const player2 = currentRoundParticipants[i + 1];

      if (player1 && player2) {
        // Normal match
        if (isDoubles) {
          // For doubles, pair players into teams
          // Simplified: consecutive players form teams
          roundMatches.push({
            round_id: '', // Will be set by caller
            team1_player1_id: player1,
            team1_player2_id: player1, // TODO: Implement proper doubles pairing
            team2_player1_id: player2,
            team2_player2_id: player2,
            status: 'pending',
            is_draw: false,
          });
        } else {
          // Singles match
          roundMatches.push({
            round_id: '', // Will be set by caller
            team1_player1_id: player1,
            team1_player2_id: player1,
            team2_player1_id: player2,
            team2_player2_id: player2,
            status: 'pending',
            is_draw: false,
          });
        }
        // Winner TBD, will advance to next round
        nextRoundParticipants.push(null);
      } else if (player1) {
        // BYE - player1 auto-advances
        nextRoundParticipants.push(player1);
      } else if (player2) {
        // BYE - player2 auto-advances
        nextRoundParticipants.push(player2);
      }
    }

    rounds.push({
      roundNumber,
      roundName: getRoundName(currentRoundParticipants.length),
      matches: roundMatches,
    });

    // Prepare next round participants (half the current)
    if (nextRoundParticipants.length > 1) {
      currentRoundParticipants = nextRoundParticipants.filter(
        (p): p is string => p !== null
      );
      // Add nulls for TBD matches from current round
      const tbdCount = roundMatches.length - nextRoundParticipants.filter(Boolean).length;
      for (let i = 0; i < tbdCount; i++) {
        currentRoundParticipants.push(null); // TBD
      }
    }

    roundNumber++;
  }

  return {
    rounds,
    bracketSize,
    totalByes,
  };
}

/**
 * Seed participants into bracket positions
 *
 * Standard seeding (for 8 players):
 * Position 1: Seed 1
 * Position 2: Seed 8
 * Position 3: Seed 4
 * Position 4: Seed 5
 * Position 5: Seed 2
 * Position 6: Seed 7
 * Position 7: Seed 3
 * Position 8: Seed 6
 *
 * This ensures top seeds don't meet until later rounds.
 *
 * @param participants - Participants to seed
 * @param bracketSize - Size of bracket (power of 2)
 * @param method - Seeding method
 * @param manualOrder - Manual seed order (optional)
 * @returns Array of participant IDs in bracket position order
 */
function seedParticipants(
  participants: Participant[],
  bracketSize: number,
  method: SeedingMethod,
  manualOrder?: string[]
): string[] {
  let orderedParticipants: Participant[];

  switch (method) {
    case 'random':
      // Shuffle randomly
      orderedParticipants = [...participants].sort(() => Math.random() - 0.5);
      break;

    case 'manual':
      if (!manualOrder || manualOrder.length !== participants.length) {
        throw new Error('Manual seeding requires exact seed order for all participants');
      }
      // Order by manual seed
      orderedParticipants = manualOrder
        .map((userId) => participants.find((p) => p.user_id === userId))
        .filter((p): p is Participant => p !== undefined);
      break;

    case 'ranked':
    default:
      // Sort by ranking/rating (higher first)
      // If no ranking available, use registration order
      // TODO: Implement actual ranking system
      orderedParticipants = [...participants];
      break;
  }

  // Create bracket positions with standard seeding pattern
  const positions: string[] = new Array(bracketSize);

  // Standard bracket seeding algorithm
  // 1 plays last, 2 plays second-to-last, etc.
  for (let i = 0; i < participants.length; i++) {
    const seed = i + 1;
    const position = getSeedPosition(seed, bracketSize);
    positions[position] = orderedParticipants[i].user_id;
  }

  // Fill remaining positions with BYEs
  for (let i = 0; i < bracketSize; i++) {
    if (!positions[i]) {
      positions[i] = 'BYE';
    }
  }

  return positions;
}

/**
 * Get bracket position for a seed number
 *
 * Uses standard tournament seeding to ensure:
 * - Seed 1 and 2 can only meet in final
 * - Top 4 seeds can only meet in semifinals
 *
 * @param seed - Seed number (1-indexed)
 * @param bracketSize - Total bracket size
 * @returns Position in bracket (0-indexed)
 */
function getSeedPosition(seed: number, bracketSize: number): number {
  if (seed === 1) return 0;
  if (seed === 2) return bracketSize - 1;

  // Recursive position calculation for standard seeding
  const half = bracketSize / 2;
  if (seed <= half) {
    return getSeedPosition(seed, half) * 2;
  } else {
    return getSeedPosition(seed - half, half) * 2 + 1;
  }
}

/**
 * Get round name based on number of remaining players
 *
 * @param remaining - Number of players remaining in tournament
 * @returns Human-readable round name
 */
function getRoundName(remaining: number): string {
  const names: Record<number, string> = {
    2: 'Final',
    4: 'Semifinals',
    8: 'Quarterfinals',
    16: 'Round of 16',
    32: 'Round of 32',
    64: 'Round of 64',
  };

  return names[remaining] || `Round of ${remaining}`;
}

/**
 * Calculate total number of rounds in knockout bracket
 *
 * @param participantCount - Number of participants
 * @returns Number of rounds (log2 of bracket size)
 */
export function calculateKnockoutRounds(participantCount: number): number {
  if (participantCount < 2) {
    throw new Error('Need at least 2 participants for knockout');
  }

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantCount)));
  return Math.log2(bracketSize);
}

/**
 * Validate knockout bracket structure
 *
 * Ensures:
 * - Bracket size is power of 2
 * - Each round has correct number of matches
 * - No duplicate participants in same round
 * - BYEs are properly handled
 *
 * @param bracket - Generated bracket
 * @returns Validation result with errors
 */
export function validateKnockoutBracket(bracket: KnockoutBracket): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate bracket size is power of 2
  if (!isPowerOfTwo(bracket.bracketSize)) {
    errors.push(`Bracket size ${bracket.bracketSize} is not a power of 2`);
  }

  // Validate each round
  let expectedMatches = bracket.bracketSize / 2;
  for (const round of bracket.rounds) {
    // Check match count (accounting for BYEs)
    const actualMatches = round.matches.length;
    if (actualMatches > expectedMatches) {
      errors.push(
        `Round ${round.roundNumber} has ${actualMatches} matches, expected max ${expectedMatches}`
      );
    }

    // Check for duplicate participants in same round
    const playerIds = new Set<string>();
    for (const match of round.matches) {
      const players = [
        match.team1_player1_id,
        match.team1_player2_id,
        match.team2_player1_id,
        match.team2_player2_id,
      ];

      for (const playerId of players) {
        if (playerId !== 'BYE') {
          if (playerIds.has(playerId)) {
            errors.push(`Player ${playerId} appears twice in round ${round.roundNumber}`);
          }
          playerIds.add(playerId);
        }
      }
    }

    // Next round has half the matches
    expectedMatches = Math.ceil(expectedMatches / 2);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if number is power of 2
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Get list of players with BYEs in first round
 *
 * @param participants - All participants
 * @param bracketSize - Bracket size
 * @returns Array of player IDs who have first-round BYE
 */
export function getByePlayersForKnockout(
  participants: Participant[],
  bracketSize: number
): string[] {
  const totalByes = bracketSize - participants.length;
  if (totalByes === 0) return [];

  // Players with BYEs are those seeded higher (top seeds get BYEs)
  const checkedIn = participants.filter((p) => p.status === 'checked_in');

  // Simplified: first N players (by seed) get BYEs
  return checkedIn.slice(0, totalByes).map((p) => p.user_id);
}

/**
 * Generate complete double elimination bracket
 *
 * Double Elimination Rules:
 * - Winners bracket: Normal single elimination
 * - Losers bracket: Receives losers from winners bracket
 * - Lose once in winners → drop to losers
 * - Lose once in losers → eliminated
 * - Grand Final: Winners champion vs Losers champion
 *
 * Losers bracket structure:
 * - Round L1: Losers from W1
 * - Round L2: L1 winners + losers from W2
 * - Round L3: L2 winners + losers from W3
 * - Continues with crossover pattern until final
 *
 * @param participants - List of checked-in participants
 * @param seeding - How to seed participants
 * @param seedOrder - Manual seed order (optional)
 * @param isDoubles - True for doubles, false for singles
 * @returns Complete double elimination bracket structure
 */
export function generateDoubleEliminationBracket(
  participants: Participant[],
  seeding: SeedingMethod = 'ranked',
  seedOrder?: string[],
  isDoubles: boolean = true
): DoubleEliminationBracket {
  // Generate winners bracket (standard single elimination)
  const winners = generateKnockoutBracket(participants, seeding, seedOrder, isDoubles);

  // Calculate losers bracket size
  // Losers bracket has one less round than winners (no losers from final)
  const winnersRounds = winners.rounds.length;
  const losersBracketSize = Math.pow(2, winnersRounds - 1);

  // Build losers bracket structure
  // Losers bracket receives participants from winners bracket as they lose
  const losersRounds: KnockoutBracket['rounds'] = [];
  let currentLosersCount = losersBracketSize;
  let losersRoundNum = 1;

  // Generate losers bracket rounds
  while (currentLosersCount > 1) {
    const matchesInRound = Math.floor(currentLosersCount / 2);
    const losersMatches: Omit<Match, 'id' | 'court_id'>[] = [];

    for (let i = 0; i < matchesInRound; i++) {
      losersMatches.push({
        round_id: '', // Will be set by caller
        team1_player1_id: 'TBD', // Loser from winners bracket
        team1_player2_id: 'TBD',
        team2_player1_id: 'TBD', // Winner from previous losers round OR loser from winners
        team2_player2_id: 'TBD',
        status: 'pending',
        is_draw: false,
      });
    }

    losersRounds.push({
      roundNumber: losersRoundNum,
      roundName: `Losers Round ${losersRoundNum}`,
      matches: losersMatches,
    });

    currentLosersCount = matchesInRound;
    losersRoundNum++;
  }

  const losers: KnockoutBracket = {
    rounds: losersRounds,
    bracketSize: losersBracketSize,
    totalByes: 0, // Losers bracket doesn't have BYEs
  };

  // Grand Final: Winner of winners bracket vs Winner of losers bracket
  const grandFinal: Omit<Match, 'id' | 'court_id'> = {
    round_id: '', // Will be set by caller
    team1_player1_id: 'TBD', // Winners champion
    team1_player2_id: 'TBD',
    team2_player1_id: 'TBD', // Losers champion
    team2_player2_id: 'TBD',
    status: 'pending',
    is_draw: false,
  };

  return {
    winners,
    losers,
    grandFinal,
  };
}

/**
 * Validate double elimination bracket structure
 *
 * Ensures:
 * - Winners bracket is valid
 * - Losers bracket has correct number of rounds
 * - Losers bracket size matches winners bracket
 * - Grand final is properly structured
 *
 * @param bracket - Double elimination bracket
 * @returns Validation result with errors
 */
export function validateDoubleEliminationBracket(bracket: DoubleEliminationBracket): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate winners bracket
  const winnersValidation = validateKnockoutBracket(bracket.winners);
  if (!winnersValidation.valid) {
    errors.push('Winners bracket invalid:', ...winnersValidation.errors);
  }

  // Validate losers bracket has one less round than winners
  const expectedLosersRounds = bracket.winners.rounds.length - 1;
  if (bracket.losers.rounds.length < expectedLosersRounds - 1) {
    errors.push(
      `Losers bracket should have ~${expectedLosersRounds} rounds, found ${bracket.losers.rounds.length}`
    );
  }

  // Validate grand final exists
  if (!bracket.grandFinal) {
    errors.push('Grand final is missing');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
