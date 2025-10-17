/**
 * Monrad System Tournament Algorithm
 *
 * Hybrid tournament combining Swiss System with Knockout bracket.
 * Provides fair initial rounds with exciting knockout finale.
 *
 * Monrad Rules:
 * - Phase 1: Swiss system for initial rounds (3-5 rounds)
 * - Phase 2: Top N players advance to knockout bracket
 * - Combines fairness of Swiss with excitement of elimination
 * - Popular for medium-large tournaments (16-64 players)
 *
 * Typical Configuration:
 * - 32 players: 4 Swiss rounds → Top 8 to knockout
 * - 64 players: 5 Swiss rounds → Top 16 to knockout
 */

import type { Match, Standing } from './types';
import { generateSwissRound, type SwissRoundConfig } from './swiss';
import { generateKnockoutBracket } from './knockout';

export interface MonradConfig {
  swissRounds: number; // Number of Swiss rounds (3-5 typical)
  finalBracketSize: number; // Players advancing to knockout (8, 16, 32)
  pairingMethod: 'slide' | 'fold' | 'accelerated';
}

export interface MonradTournament {
  phase1: {
    type: 'swiss';
    rounds: {
      roundNumber: number;
      matches: Omit<Match, 'id' | 'court_id'>[];
    }[];
    finalStandings: Standing[];
  };
  phase2: {
    type: 'knockout';
    qualifiers: Standing[]; // Top N from Swiss
    bracket: {
      rounds: {
        roundNumber: number;
        roundName: string;
        matches: Omit<Match, 'id' | 'court_id'>[];
      }[];
      bracketSize: number;
      totalByes: number;
    };
  };
}

/**
 * Generate complete Monrad tournament structure
 *
 * Algorithm:
 * 1. Run Swiss rounds to establish rankings
 * 2. Take top N players based on standings
 * 3. Generate knockout bracket with qualified players
 * 4. Seed bracket based on Swiss final standings
 *
 * @param config - Monrad configuration
 * @param initialStandings - Starting standings (empty for new tournament)
 * @param previousMatches - All previous matches for Swiss pairing
 * @param isDoubles - True for doubles, false for singles
 * @returns Complete Monrad tournament structure
 */
export function generateMonradTournament(
  config: MonradConfig,
  initialStandings: Standing[],
  previousMatches: Match[] = [],
  isDoubles: boolean = true
): MonradTournament {
  const { swissRounds, finalBracketSize, pairingMethod } = config;

  // Validate configuration
  validateMonradConfig(config, initialStandings.length);

  // Phase 1: Generate Swiss rounds (simulated for structure)
  const swissRoundsData: { roundNumber: number; matches: Omit<Match, 'id' | 'court_id'>[] }[] = [];

  for (let i = 1; i <= swissRounds; i++) {
    const roundConfig: SwissRoundConfig = {
      roundNumber: i,
      pairingMethod,
      standings: initialStandings,
      previousMatches,
    };

    const roundMatches = generateSwissRound(roundConfig, isDoubles);
    swissRoundsData.push({
      roundNumber: i,
      matches: roundMatches,
    });

    // Note: In real implementation, standings would be updated after each round
    // For structure generation, we use initial standings
  }

  // Phase 2: Top N players advance to knockout
  const qualifiedPlayers = getTopQualifiers(initialStandings, finalBracketSize);

  // Generate knockout bracket with qualified players
  // Use Swiss standings order as seeding
  const bracket = generateKnockoutBracket(
    qualifiedPlayers.map(s => ({
      id: s.user_id, // Use user_id as participant id
      user_id: s.user_id,
      tournament_id: s.tournament_id,
      status: 'checked_in' as const,
    })),
    'ranked', // Use Swiss ranking as seed
    undefined,
    isDoubles
  );

  return {
    phase1: {
      type: 'swiss',
      rounds: swissRoundsData,
      finalStandings: initialStandings,
    },
    phase2: {
      type: 'knockout',
      qualifiers: qualifiedPlayers,
      bracket,
    },
  };
}

/**
 * Get top N players from standings for knockout qualification
 *
 * @param standings - Current standings after Swiss rounds
 * @param count - Number of players to qualify
 * @returns Top N players sorted by rank
 */
function getTopQualifiers(standings: Standing[], count: number): Standing[] {
  // Sort by points, then tiebreakers
  const sorted = [...standings].sort((a, b) => {
    // Primary: Points
    if (a.points !== b.points) return b.points - a.points;

    // Secondary: Games difference
    if (a.games_diff !== b.games_diff) return b.games_diff - a.games_diff;

    // Tertiary: Games won
    if (a.games_won !== b.games_won) return b.games_won - a.games_won;

    return 0;
  });

  return sorted.slice(0, count);
}

/**
 * Validate Monrad configuration
 *
 * Ensures:
 * - Swiss rounds are reasonable (3-7)
 * - Final bracket size is power of 2
 * - Enough players for bracket size
 * - Configuration makes sense
 *
 * @param config - Monrad configuration
 * @param totalPlayers - Total number of players
 */
function validateMonradConfig(config: MonradConfig, totalPlayers: number): void {
  const { swissRounds, finalBracketSize } = config;

  // Validate Swiss rounds
  if (swissRounds < 3 || swissRounds > 7) {
    throw new Error('Monrad Swiss rounds must be between 3 and 7');
  }

  // Validate bracket size is power of 2
  if (!isPowerOfTwo(finalBracketSize)) {
    throw new Error(`Final bracket size ${finalBracketSize} must be power of 2 (4, 8, 16, 32)`);
  }

  // Validate enough players for bracket
  if (finalBracketSize > totalPlayers) {
    throw new Error(
      `Final bracket size ${finalBracketSize} cannot exceed total players ${totalPlayers}`
    );
  }

  // Validate reasonable proportion (at least 25% advance)
  if (finalBracketSize < totalPlayers / 4) {
    console.warn(
      `Warning: Only ${finalBracketSize} of ${totalPlayers} players (${Math.round((finalBracketSize / totalPlayers) * 100)}%) advance to knockout. Consider larger bracket.`
    );
  }
}

/**
 * Check if number is power of 2
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Calculate recommended Monrad configuration
 *
 * Based on total player count, suggests optimal:
 * - Number of Swiss rounds
 * - Final bracket size
 *
 * @param totalPlayers - Total number of participants
 * @returns Recommended Monrad configuration
 */
export function calculateMonradConfig(totalPlayers: number): MonradConfig {
  let swissRounds: number;
  let finalBracketSize: number;

  if (totalPlayers <= 16) {
    // Small tournament: 3 Swiss → Top 4/8
    swissRounds = 3;
    finalBracketSize = totalPlayers >= 8 ? 8 : 4;
  } else if (totalPlayers <= 32) {
    // Medium tournament: 4 Swiss → Top 8/16
    swissRounds = 4;
    finalBracketSize = totalPlayers >= 16 ? 16 : 8;
  } else if (totalPlayers <= 64) {
    // Large tournament: 5 Swiss → Top 16/32
    swissRounds = 5;
    finalBracketSize = totalPlayers >= 32 ? 32 : 16;
  } else {
    // Very large: 6-7 Swiss → Top 32/64
    swissRounds = 6;
    finalBracketSize = Math.min(64, Math.pow(2, Math.floor(Math.log2(totalPlayers / 2))));
  }

  return {
    swissRounds,
    finalBracketSize,
    pairingMethod: 'slide', // Default to slide pairing
  };
}

/**
 * Check if player qualified for knockout phase
 *
 * @param userId - Player user ID
 * @param qualifiers - List of qualified players
 * @returns True if player qualified
 */
export function hasQualifiedForKnockout(userId: string, qualifiers: Standing[]): boolean {
  return qualifiers.some((q) => q.user_id === userId);
}

/**
 * Get qualification cutoff (minimum points needed)
 *
 * @param qualifiers - Qualified players
 * @returns Minimum points needed to qualify
 */
export function getQualificationCutoff(qualifiers: Standing[]): number {
  if (qualifiers.length === 0) return 0;

  // Points of last qualifier (minimum to qualify)
  return qualifiers[qualifiers.length - 1].points;
}
