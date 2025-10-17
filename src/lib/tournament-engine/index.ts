/**
 * Tournament Engine
 *
 * Main interface for tournament round generation, court assignment,
 * and standings calculation.
 *
 * Supports:
 * - Americano (Round Robin)
 * - Mexicano (Winners/Losers)
 */

import {
  generateAmericanoRound,
  validateAmericanoRound,
  hasPairedBefore,
} from './americano';
import {
  generateMexicanoRound,
  validateMexicanoRound,
  calculateOptimalRounds,
} from './mexicano';
import {
  assignCourts,
  getCourtUsageStats,
  getLeastUsedCourts,
  validateCourtAssignments,
} from './court-rotation';
import {
  calculateStandings,
  updateStandingsForMatch,
  getTopPlayers,
  getPlayerRank,
  isTournamentComplete,
} from './standings';

import type {
  Participant,
  Match,
  Standing,
  Court,
  MatchWithCourt,
  TournamentConfig,
  ValidationResult,
  CourtRotationStrategy,
} from './types';

// Re-export types
export type {
  Participant,
  Match,
  Standing,
  Court,
  MatchWithCourt,
  Round,
  TournamentConfig,
  ValidationResult,
  CourtRotationStrategy,
  PairingStrategy,
} from './types';

/**
 * Tournament Engine Interface
 *
 * Main class for coordinating tournament operations.
 */
export class TournamentEngine {
  /**
   * Generate next round for a tournament
   *
   * @param type - Tournament type ('americano' or 'mexicano')
   * @param participants - All tournament participants
   * @param roundNumber - Round number to generate (1-indexed)
   * @param previousMatches - Matches from previous rounds
   * @param standings - Current standings (required for Mexicano round 2+)
   * @param courts - Available courts for assignment
   * @param courtStrategy - Court rotation strategy
   * @returns Matches with court assignments
   */
  static async generateNextRound(
    type: 'americano' | 'mexicano',
    participants: Participant[],
    roundNumber: number,
    previousMatches: Match[],
    standings: Standing[],
    courts: Court[],
    courtStrategy: CourtRotationStrategy = 'balanced'
  ): Promise<MatchWithCourt[]> {
    // Generate matches based on tournament type
    let matches: Omit<Match, 'id' | 'court_id'>[];

    if (type === 'americano') {
      matches = generateAmericanoRound(participants, roundNumber, previousMatches);

      // Validate Americano round
      const validation = validateAmericanoRound(matches as Match[], participants);
      if (!validation.valid) {
        throw new Error(`Invalid Americano round: ${validation.errors.join(', ')}`);
      }
    } else if (type === 'mexicano') {
      matches = generateMexicanoRound(participants, roundNumber, standings);

      // Validate Mexicano round
      const validation = validateMexicanoRound(matches as Match[], participants);
      if (!validation.valid) {
        throw new Error(`Invalid Mexicano round: ${validation.errors.join(', ')}`);
      }
    } else {
      throw new Error(`Unknown tournament type: ${type}`);
    }

    // Assign courts to matches
    const matchesWithCourts = assignCourts(matches, courts, courtStrategy);

    // Validate court assignments
    const courtValidation = validateCourtAssignments(matchesWithCourts, courts);
    if (!courtValidation.valid) {
      throw new Error(
        `Invalid court assignments: ${courtValidation.errors.join(', ')}`
      );
    }

    return matchesWithCourts;
  }

  /**
   * Update tournament standings
   *
   * Recalculates standings from all match results.
   *
   * @param tournamentId - Tournament ID
   * @param matches - All tournament matches
   * @param config - Tournament configuration
   * @returns Updated standings sorted by rank
   */
  static updateStandings(
    tournamentId: string,
    matches: Match[],
    config: TournamentConfig
  ): Standing[] {
    return calculateStandings(tournamentId, matches, config);
  }

  /**
   * Update standings incrementally for a single match
   *
   * @param match - Completed match
   * @param currentStandings - Current standings
   * @param config - Tournament configuration
   * @returns Updated standings
   */
  static updateStandingsForMatch(
    match: Match,
    currentStandings: Standing[],
    config: TournamentConfig
  ): Standing[] {
    return updateStandingsForMatch(match, currentStandings, config);
  }

  /**
   * Validate tournament can start
   *
   * Checks:
   * - Minimum participants (4+)
   * - Even number of participants
   * - All participants are checked in
   * - Sufficient courts available
   *
   * @param participants - Tournament participants
   * @param courts - Available courts
   * @returns Validation result with errors and warnings
   */
  static validateTournamentStart(
    participants: Participant[],
    courts: Court[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Count checked-in participants
    const checkedIn = participants.filter((p) => p.status === 'checked_in');
    const playerCount = checkedIn.length;

    // Validate minimum players
    if (playerCount < 4) {
      errors.push(`Need at least 4 players, only ${playerCount} checked in`);
    }

    // Validate even number
    if (playerCount % 2 !== 0) {
      errors.push(`Need even number of players, currently ${playerCount}`);
    }

    // Validate courts
    const activeCourts = courts.filter((c) => c.status === 'active');
    if (activeCourts.length === 0) {
      errors.push('No active courts available');
    }

    // Calculate required courts (each match needs 1 court)
    const requiredCourts = Math.floor(playerCount / 4);
    if (activeCourts.length < requiredCourts) {
      warnings.push(
        `Only ${activeCourts.length} courts for ${requiredCourts} matches. Some matches will wait.`
      );
    }

    // Warn about unchecked participants
    const registered = participants.filter((p) => p.status === 'registered');
    if (registered.length > 0) {
      warnings.push(
        `${registered.length} participants registered but not checked in`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get top players from standings
   *
   * @param standings - Current standings
   * @param count - Number of top players
   * @returns Top N players
   */
  static getTopPlayers(standings: Standing[], count: number): Standing[] {
    return getTopPlayers(standings, count);
  }

  /**
   * Get player rank
   *
   * @param userId - Player user ID
   * @param standings - Current standings
   * @returns Player's rank or undefined
   */
  static getPlayerRank(userId: string, standings: Standing[]): number | undefined {
    return getPlayerRank(userId, standings);
  }

  /**
   * Check if tournament is complete
   *
   * @param matches - All tournament matches
   * @returns True if all matches completed
   */
  static isTournamentComplete(matches: Match[]): boolean {
    return isTournamentComplete(matches);
  }

  /**
   * Get court usage statistics
   *
   * @param matches - All matches from all rounds
   * @returns Map of court_id to usage count
   */
  static getCourtUsageStats(matches: Match[]): Map<string, number> {
    return getCourtUsageStats(matches);
  }

  /**
   * Get least used courts (for balanced rotation)
   *
   * @param courts - All available courts
   * @param usageStats - Court usage statistics
   * @returns Courts sorted by usage (least to most)
   */
  static getLeastUsedCourts(
    courts: Court[],
    usageStats: Map<string, number>
  ): Court[] {
    return getLeastUsedCourts(courts, usageStats);
  }

  /**
   * Calculate optimal rounds for Mexicano
   *
   * @param playerCount - Number of participants
   * @returns Recommended number of rounds
   */
  static calculateOptimalRounds(playerCount: number): number {
    return calculateOptimalRounds(playerCount);
  }

  /**
   * Check if two players have paired before
   *
   * @param player1 - First player ID
   * @param player2 - Second player ID
   * @param previousMatches - All previous matches
   * @returns True if paired before
   */
  static hasPairedBefore(
    player1: string,
    player2: string,
    previousMatches: Match[]
  ): boolean {
    return hasPairedBefore(player1, player2, previousMatches);
  }
}

// Also export individual functions for flexibility
export {
  // Americano
  generateAmericanoRound,
  validateAmericanoRound,
  hasPairedBefore,
  // Mexicano
  generateMexicanoRound,
  validateMexicanoRound,
  calculateOptimalRounds,
  // Court rotation
  assignCourts,
  getCourtUsageStats,
  getLeastUsedCourts,
  validateCourtAssignments,
  // Standings
  calculateStandings,
  updateStandingsForMatch,
  getTopPlayers,
  getPlayerRank,
  isTournamentComplete,
};
