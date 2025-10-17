/**
 * Bracket Progression System
 *
 * Handles automatic advancement of winners/losers through tournament brackets.
 * Supports:
 * - Single Elimination (winner advances, loser eliminated)
 * - Double Elimination (winner advances in winners bracket, loser drops to losers bracket)
 * - Automatic BYE handling (player auto-advances if opponent is BYE)
 * - Grand Final (winners bracket champion vs losers bracket champion)
 *
 * Progression Algorithm:
 * Single Elimination:
 *   nextRound = currentRound + 1
 *   nextPosition = floor(currentPosition / 2)
 *
 * Double Elimination:
 *   Winners → Losers: losersRound = (winnersRound * 2) - 1
 *   Losers → Eliminated (no further progression)
 *
 * Example (8-player single elimination):
 *   Round 1, Position 0,1 → Round 2, Position 0
 *   Round 1, Position 2,3 → Round 2, Position 1
 *   Round 2, Position 0,1 → Round 3, Position 0 (Final)
 */

import type { Match, TournamentConfig } from './types';

/**
 * Result of bracket progression operation
 */
export interface ProgressionResult {
  success: boolean;
  nextMatchId?: string;
  nextBracketPosition?: BracketPosition;
  isComplete: boolean; // True if tournament is complete
  message: string;
}

/**
 * Bracket position identifier
 */
export interface BracketPosition {
  tournamentId: string;
  bracketType: 'main' | 'consolation' | 'losers' | 'third_place';
  roundNumber: number;
  position: number;
}

/**
 * Service for managing bracket progression in knockout tournaments
 */
export class BracketProgressionService {
  /**
   * Advance winner to next round after match completion
   *
   * Process:
   * 1. Find current bracket position of completed match
   * 2. Determine next bracket position (based on tournament type)
   * 3. Get or create next match
   * 4. Assign winner to correct team slot in next match
   * 5. If double elimination: route loser to losers bracket
   * 6. If opponent in next match is BYE: auto-advance recursively
   *
   * @param matchId - ID of completed match
   * @param winnerId - User ID of winner (player 1 in doubles)
   * @param winnerPartnerId - User ID of winner's partner (doubles only)
   * @param loserId - User ID of loser (player 1 in doubles)
   * @param loserPartnerId - User ID of loser's partner (doubles only)
   * @param tournamentType - Type of tournament (knockout_single, knockout_double)
   * @returns Progression result with next match info
   */
  async advanceWinner(
    matchId: string,
    winnerId: string,
    winnerPartnerId: string,
    loserId: string,
    loserPartnerId: string,
    tournamentType: TournamentConfig['type']
  ): Promise<ProgressionResult> {
    try {
      // 1. Find current bracket position
      const currentBracket = await this.findBracketPosition(matchId);
      if (!currentBracket) {
        return {
          success: false,
          isComplete: false,
          message: 'Match not found in bracket structure',
        };
      }

      // 2. Check if this is the final match (no progression)
      const isFinalMatch = await this.isFinalMatch(currentBracket);
      if (isFinalMatch) {
        return {
          success: true,
          isComplete: true,
          message: 'Tournament complete - winner determined',
        };
      }

      // 3. Determine next bracket position for winner
      const nextBracket = await this.getNextBracketPosition(
        currentBracket,
        true
      );
      if (!nextBracket) {
        return {
          success: false,
          isComplete: false,
          message: 'Unable to determine next bracket position',
        };
      }

      // 4. Get or create next match
      const nextMatch = await this.getOrCreateNextMatch(
        nextBracket,
        currentBracket.tournamentId
      );

      // 5. Assign winner to next match
      const assignmentPosition = await this.determineTeamPosition(
        nextBracket,
        currentBracket
      );
      await this.assignTeamToMatch(
        nextMatch.id!,
        winnerId,
        winnerPartnerId,
        assignmentPosition
      );

      // 6. Handle double elimination: route loser
      if (
        tournamentType === 'knockout_double' &&
        currentBracket.bracketType === 'main'
      ) {
        await this.routeLoserToBracket(
          loserId,
          loserPartnerId,
          currentBracket
        );
      }

      // 7. Check if opponent is BYE (null) - auto-advance
      const isByeMatch = await this.isByeMatch(nextMatch.id!);
      if (isByeMatch) {
        // Recursively advance through BYEs
        return await this.handleBye(
          nextMatch.id!,
          winnerId,
          winnerPartnerId,
          tournamentType
        );
      }

      return {
        success: true,
        nextMatchId: nextMatch.id,
        nextBracketPosition: nextBracket,
        isComplete: false,
        message: 'Winner advanced successfully',
      };
    } catch (error) {
      return {
        success: false,
        isComplete: false,
        message: `Progression error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Route loser to losers bracket (double elimination only)
   *
   * Losers from winners bracket drop to losers bracket
   * Losers from losers bracket are eliminated (no progression)
   *
   * Winners Round N → Losers Round (2N - 1)
   *
   * @param loserId - User ID of loser
   * @param loserPartnerId - Partner ID (doubles)
   * @param sourceBracket - Bracket position where they lost
   */
  async routeLoserToBracket(
    loserId: string,
    loserPartnerId: string,
    sourceBracket: BracketPosition
  ): Promise<void> {
    // If already in losers bracket, no routing (eliminated)
    if (sourceBracket.bracketType === 'losers') {
      return;
    }

    // Calculate losers bracket position
    // Winners round N → Losers round (2N - 1)
    const losersRound = sourceBracket.roundNumber * 2 - 1;
    const losersPosition = sourceBracket.position; // Maintain position

    const losersBracket: BracketPosition = {
      tournamentId: sourceBracket.tournamentId,
      bracketType: 'losers',
      roundNumber: losersRound,
      position: losersPosition,
    };

    // Get or create match in losers bracket
    const losersMatch = await this.getOrCreateNextMatch(
      losersBracket,
      sourceBracket.tournamentId
    );

    // Assign loser to losers bracket match
    const assignmentPosition = await this.determineTeamPosition(
      losersBracket,
      sourceBracket
    );
    await this.assignTeamToMatch(
      losersMatch.id!,
      loserId,
      loserPartnerId,
      assignmentPosition
    );
  }

  /**
   * Handle BYE opponent - auto-advance player
   *
   * If player's next opponent is BYE (null):
   * 1. Mark match as auto-won
   * 2. Recursively advance to next round
   * 3. Continue until real opponent found or tournament complete
   *
   * @param matchId - Match with BYE opponent
   * @param advancingPlayerId - Player advancing
   * @param advancingPartnerId - Partner (doubles)
   * @param tournamentType - Tournament type
   * @returns Progression result
   */
  async handleBye(
    matchId: string,
    advancingPlayerId: string,
    advancingPartnerId: string,
    tournamentType: TournamentConfig['type']
  ): Promise<ProgressionResult> {
    // Mark match as auto-won (BYE)
    await this.markMatchAsAutoWon(matchId, advancingPlayerId);

    // Recursively advance to next round
    return await this.advanceWinner(
      matchId,
      advancingPlayerId,
      advancingPartnerId,
      'BYE', // Loser is BYE
      'BYE',
      tournamentType
    );
  }

  /**
   * Find bracket position for a given match
   *
   * @param matchId - Match ID
   * @returns Bracket position or null if not found
   */
  async findBracketPosition(_matchId: string): Promise<BracketPosition | null> {
    // Query tournament_bracket table
    // This would integrate with Supabase in production
    // For now, return mock structure

    // TODO: Replace with actual Supabase query
    // const { data, error } = await supabase
    //   .from('tournament_bracket')
    //   .select('*')
    //   .eq('match_id', matchId)
    //   .single();

    // Mock implementation for type safety
    return null;
  }

  /**
   * Calculate next bracket position based on current position
   *
   * Single Elimination:
   *   nextRound = currentRound + 1
   *   nextPosition = floor(currentPosition / 2)
   *
   * Double Elimination:
   *   Winners: Same as single
   *   Losers: Same as single but within losers bracket
   *
   * @param currentBracket - Current bracket position
   * @param isWinner - True for winner progression, false for loser
   * @returns Next bracket position or null if final
   */
  async getNextBracketPosition(
    currentBracket: BracketPosition,
    isWinner: boolean
  ): Promise<BracketPosition | null> {
    // Winner progression (or loser within losers bracket)
    if (isWinner || currentBracket.bracketType === 'losers') {
      return {
        tournamentId: currentBracket.tournamentId,
        bracketType: currentBracket.bracketType,
        roundNumber: currentBracket.roundNumber + 1,
        position: Math.floor(currentBracket.position / 2),
      };
    }

    // Loser from winners bracket → losers bracket
    // This is handled in routeLoserToBracket
    return null;
  }

  /**
   * Get existing match or create new match at bracket position
   *
   * @param bracket - Target bracket position
   * @param tournamentId - Tournament ID
   * @returns Match at position
   */
  async getOrCreateNextMatch(
    bracket: BracketPosition,
    _tournamentId: string
  ): Promise<Partial<Match>> {
    // TODO: Replace with actual Supabase query/insert
    // 1. Query tournament_bracket for this position
    // 2. If match_id exists, fetch match
    // 3. If not, create new match and update bracket

    // Mock implementation
    return {
      id: `match_${bracket.roundNumber}_${bracket.position}`,
      round_id: bracket.tournamentId,
      status: 'pending',
      team1_player1_id: '',
      team1_player2_id: '',
      team2_player1_id: '',
      team2_player2_id: '',
      is_draw: false,
    };
  }

  /**
   * Assign team to match (team1 or team2)
   *
   * @param matchId - Match to update
   * @param playerId - Player 1 ID
   * @param partnerId - Player 2 ID (doubles)
   * @param position - 'team1' or 'team2'
   */
  async assignTeamToMatch(
    _matchId: string,
    _playerId: string,
    _partnerId: string,
    _position: 'team1' | 'team2'
  ): Promise<void> {
    // TODO: Replace with actual Supabase update
    // Update match with team assignment

    // If both teams now assigned, update status to 'pending'
    // If only one team, keep as 'pending' until both filled
  }

  /**
   * Determine which team position (team1 or team2) for assignment
   *
   * Based on bracket progression:
   * - Even positions (0, 2, 4) → team1
   * - Odd positions (1, 3, 5) → team2
   *
   * @param targetBracket - Target bracket position
   * @param sourceBracket - Source bracket position
   * @returns Team position
   */
  async determineTeamPosition(
    _targetBracket: BracketPosition,
    sourceBracket: BracketPosition
  ): Promise<'team1' | 'team2'> {
    // If source position is even (0, 2, 4), assign to team1
    // If source position is odd (1, 3, 5), assign to team2
    return sourceBracket.position % 2 === 0 ? 'team1' : 'team2';
  }

  /**
   * Check if match is the final match (no further progression)
   *
   * @param bracket - Bracket position
   * @returns True if final match
   */
  async isFinalMatch(_bracket: BracketPosition): Promise<boolean> {
    // Final match characteristics:
    // - Main bracket, round N where only 1 match exists
    // - Or grand final in double elimination

    // TODO: Query tournament_bracket to count matches in next round
    // If count = 0, this is the final

    // Mock implementation
    return false;
  }

  /**
   * Check if match has BYE opponent (null team)
   *
   * @param matchId - Match to check
   * @returns True if BYE match
   */
  async isByeMatch(_matchId: string): Promise<boolean> {
    // TODO: Query match and check if any team has null players
    // const match = await getMatch(matchId);
    // return !match.team1_player1_id || !match.team2_player1_id;

    return false;
  }

  /**
   * Mark match as auto-won (BYE advancement)
   *
   * @param matchId - Match ID
   * @param winnerId - Winner ID
   */
  async markMatchAsAutoWon(_matchId: string, _winnerId: string): Promise<void> {
    // TODO: Update match
    // SET winner_team = 1, status = 'completed'
  }

  /**
   * Validate entire bracket progression structure
   *
   * Checks:
   * - All progression paths are valid
   * - No circular references
   * - All matches have valid bracket positions
   *
   * @param tournamentId - Tournament to validate
   * @returns Validation errors (empty if valid)
   */
  async validateProgression(_tournamentId: string): Promise<string[]> {
    const errors: string[] = [];

    // TODO: Implement validation logic
    // 1. Query all bracket positions
    // 2. Verify winner_from_match_id references
    // 3. Check for circular references
    // 4. Validate progression math

    return errors;
  }

  /**
   * Check if tournament progression is complete
   *
   * @param tournamentId - Tournament ID
   * @returns True if all matches completed and champion determined
   */
  async isProgressionComplete(_tournamentId: string): Promise<boolean> {
    // TODO: Check if final match is completed
    // Query tournament_bracket for final match
    // Check if match has winner

    return false;
  }
}

/**
 * Helper: Calculate bracket size (next power of 2)
 *
 * @param participantCount - Number of participants
 * @returns Bracket size (4, 8, 16, 32, 64, etc)
 */
export function calculateBracketSize(participantCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(participantCount)));
}

/**
 * Helper: Calculate number of BYEs needed
 *
 * @param participantCount - Number of participants
 * @returns Number of BYEs (bracket_size - participant_count)
 */
export function calculateByeCount(participantCount: number): number {
  const bracketSize = calculateBracketSize(participantCount);
  return bracketSize - participantCount;
}

/**
 * Helper: Get round name in Spanish
 *
 * @param roundNumber - Round number
 * @param totalRounds - Total rounds in tournament
 * @returns Spanish round name
 */
export function getRoundName(
  roundNumber: number,
  totalRounds: number
): string {
  const remaining = Math.pow(2, totalRounds - roundNumber + 1);

  switch (remaining) {
    case 2:
      return 'Final';
    case 4:
      return 'Semifinales';
    case 8:
      return 'Cuartos de Final';
    case 16:
      return 'Octavos de Final';
    case 32:
      return 'Dieciseisavos de Final';
    default:
      return `Ronda de ${remaining}`;
  }
}

/**
 * Helper: Calculate total rounds for bracket
 *
 * @param bracketSize - Size of bracket (power of 2)
 * @returns Number of rounds
 */
export function calculateTotalRounds(bracketSize: number): number {
  return Math.log2(bracketSize);
}

/**
 * Export service instance for convenience
 */
export const bracketProgressionService = new BracketProgressionService();
