/**
 * Compass Draw Tournament Algorithm
 *
 * Knockout tournament with consolation brackets ensuring multiple matches for all players.
 * Named for compass directions representing different consolation levels.
 *
 * Compass Draw Structure:
 * - Main Draw: Standard knockout (winners advance)
 * - Consolation Brackets: Losers continue in separate brackets
 * - Multiple Finals: Main final + consolation finals at each level
 *
 * Bracket Hierarchy:
 * - Main Draw (Championship)
 * - East/West (First-round losers)
 * - North-East/South-East (East bracket paths)
 * - North-West/South-West (West bracket paths)
 *
 * Benefits:
 * - Everyone plays minimum 2-3 matches
 * - Multiple championship opportunities
 * - Fair consolation structure
 */

import type { Match, Participant } from './types';
import { generateKnockoutBracket, type KnockoutBracket } from './knockout';

export interface ConsolationBracket {
  name: 'east' | 'west' | 'north_east' | 'south_east' | 'north_west' | 'south_west';
  rounds: {
    roundNumber: number;
    roundName: string;
    matches: Omit<Match, 'id' | 'court_id'>[];
  }[];
  bracketSize: number;
  sourceMainRound?: number; // Which main round feeds this bracket
}

export interface CompassDrawStructure {
  mainDraw: KnockoutBracket;
  consolationBrackets: {
    east: ConsolationBracket | null;
    west: ConsolationBracket | null;
    northEast: ConsolationBracket | null;
    southEast: ConsolationBracket | null;
    northWest: ConsolationBracket | null;
    southWest: ConsolationBracket | null;
  };
  totalBrackets: number;
}

/**
 * Generate complete Compass Draw structure
 *
 * Algorithm:
 * 1. Generate main knockout bracket
 * 2. Create consolation brackets for losers
 * 3. Route losers to appropriate consolation levels
 * 4. Generate finals for each consolation bracket
 *
 * Simplified Compass (8-16 players):
 * - Main Draw
 * - East Consolation (main R1 losers)
 * - West Consolation (main R1 losers)
 *
 * Full Compass (32+ players):
 * - All 7 brackets (main + 6 consolations)
 *
 * @param participants - List of participants
 * @param seeding - Seeding method for main draw
 * @param isDoubles - True for doubles
 * @returns Complete Compass Draw structure
 */
export function generateCompassDraw(
  participants: Participant[],
  seeding: 'random' | 'ranked' | 'manual' = 'ranked',
  seedOrder?: string[],
  isDoubles: boolean = true
): CompassDrawStructure {
  // Generate main knockout bracket
  const mainDraw = generateKnockoutBracket(participants, seeding, seedOrder, isDoubles);

  const bracketSize = mainDraw.bracketSize;

  // Determine consolation structure based on main bracket size
  const consolationBrackets: CompassDrawStructure['consolationBrackets'] = {
    east: null,
    west: null,
    northEast: null,
    southEast: null,
    northWest: null,
    southWest: null,
  };

  // Small Compass (8-16): Only East/West
  if (bracketSize <= 16) {
    consolationBrackets.east = generateConsolationBracket('east', 1, bracketSize / 4, isDoubles);
    consolationBrackets.west = generateConsolationBracket('west', 1, bracketSize / 4, isDoubles);
  }
  // Medium Compass (32): East/West + North-East/South-East
  else if (bracketSize <= 32) {
    consolationBrackets.east = generateConsolationBracket('east', 1, bracketSize / 4, isDoubles);
    consolationBrackets.west = generateConsolationBracket('west', 1, bracketSize / 4, isDoubles);
    consolationBrackets.northEast = generateConsolationBracket(
      'north_east',
      2,
      bracketSize / 8,
      isDoubles
    );
    consolationBrackets.southEast = generateConsolationBracket(
      'south_east',
      2,
      bracketSize / 8,
      isDoubles
    );
  }
  // Full Compass (64+): All 6 consolation brackets
  else {
    consolationBrackets.east = generateConsolationBracket('east', 1, bracketSize / 4, isDoubles);
    consolationBrackets.west = generateConsolationBracket('west', 1, bracketSize / 4, isDoubles);
    consolationBrackets.northEast = generateConsolationBracket(
      'north_east',
      2,
      bracketSize / 8,
      isDoubles
    );
    consolationBrackets.southEast = generateConsolationBracket(
      'south_east',
      2,
      bracketSize / 8,
      isDoubles
    );
    consolationBrackets.northWest = generateConsolationBracket(
      'north_west',
      2,
      bracketSize / 8,
      isDoubles
    );
    consolationBrackets.southWest = generateConsolationBracket(
      'south_west',
      2,
      bracketSize / 8,
      isDoubles
    );
  }

  const totalBrackets = 1 + Object.values(consolationBrackets).filter(Boolean).length;

  return {
    mainDraw,
    consolationBrackets,
    totalBrackets,
  };
}

/**
 * Generate a single consolation bracket
 *
 * @param name - Bracket name (compass direction)
 * @param sourceRound - Which main round feeds this bracket
 * @param size - Bracket size
 * @param isDoubles - Doubles format flag
 * @returns Consolation bracket structure
 */
function generateConsolationBracket(
  name: ConsolationBracket['name'],
  sourceRound: number,
  size: number,
  _isDoubles: boolean
): ConsolationBracket {
  const rounds: ConsolationBracket['rounds'] = [];
  let currentSize = size;
  let roundNum = 1;

  // Generate rounds until final
  while (currentSize > 1) {
    const matchCount = currentSize / 2;
    const matches: Omit<Match, 'id' | 'court_id'>[] = [];

    for (let i = 0; i < matchCount; i++) {
      matches.push({
        round_id: '',
        team1_player1_id: 'TBD', // Loser from main/previous consolation
        team1_player2_id: 'TBD',
        team2_player1_id: 'TBD',
        team2_player2_id: 'TBD',
        status: 'pending',
        is_draw: false,
      });
    }

    rounds.push({
      roundNumber: roundNum,
      roundName: getConsolationRoundName(name, roundNum, currentSize),
      matches,
    });

    currentSize = matchCount;
    roundNum++;
  }

  return {
    name,
    rounds,
    bracketSize: size,
    sourceMainRound: sourceRound,
  };
}

/**
 * Get round name for consolation bracket
 *
 * @param bracketName - Consolation bracket name
 * @param roundNum - Round number
 * @param playersRemaining - Players left in bracket
 * @returns Human-readable round name
 */
function getConsolationRoundName(
  bracketName: string,
  roundNum: number,
  playersRemaining: number
): string {
  const bracketLabel = bracketName
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');

  if (playersRemaining === 2) {
    return `${bracketLabel} Final`;
  } else if (playersRemaining === 4) {
    return `${bracketLabel} Semifinals`;
  } else {
    return `${bracketLabel} Round ${roundNum}`;
  }
}

/**
 * Route loser to appropriate consolation bracket
 *
 * Routing Logic:
 * - Main R1 losers → East/West (alternating or by seed)
 * - East losers → North-East/South-East
 * - West losers → North-West/South-West
 *
 * @param mainRound - Round where player lost in main
 * @param position - Position in that round
 * @returns Target consolation bracket name
 */
export function routeLoserToConsolation(
  mainRound: number,
  position: number
): ConsolationBracket['name'] | null {
  // Round 1 losers
  if (mainRound === 1) {
    // Alternate East/West or split by position
    return position % 2 === 0 ? 'east' : 'west';
  }

  // Round 2 losers (if consolation brackets exist)
  if (mainRound === 2) {
    // From East bracket
    if (position < 4) {
      return position % 2 === 0 ? 'north_east' : 'south_east';
    }
    // From West bracket
    else {
      return position % 2 === 0 ? 'north_west' : 'south_west';
    }
  }

  // Later rounds: no further consolation
  return null;
}

/**
 * Validate Compass Draw structure
 *
 * Ensures:
 * - Main bracket is valid
 * - Consolation brackets are properly sized
 * - Routing is logical
 * - All brackets are powers of 2
 *
 * @param compass - Compass Draw structure
 * @returns Validation result
 */
export function validateCompassDraw(compass: CompassDrawStructure): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate main bracket size
  if (!isPowerOfTwo(compass.mainDraw.bracketSize)) {
    errors.push(`Main bracket size ${compass.mainDraw.bracketSize} is not power of 2`);
  }

  // Validate consolation brackets
  for (const [name, bracket] of Object.entries(compass.consolationBrackets)) {
    if (bracket) {
      if (!isPowerOfTwo(bracket.bracketSize)) {
        errors.push(
          `Consolation bracket ${name} size ${bracket.bracketSize} is not power of 2`
        );
      }

      // Check bracket size relationship to main
      const expectedMaxSize = compass.mainDraw.bracketSize / 2;
      if (bracket.bracketSize > expectedMaxSize) {
        errors.push(
          `Consolation bracket ${name} (${bracket.bracketSize}) too large for main bracket (${compass.mainDraw.bracketSize})`
        );
      }
    }
  }

  // Validate total brackets count
  if (compass.totalBrackets < 1 || compass.totalBrackets > 7) {
    errors.push(`Invalid total brackets count: ${compass.totalBrackets} (expected 1-7)`);
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
 * Get minimum matches a player will play in Compass Draw
 *
 * @param totalPlayers - Total participants
 * @returns Minimum matches guaranteed
 */
export function getMinimumMatchesPerPlayer(_totalPlayers: number): number {
  // Main draw round 1 + consolation round 1 = minimum 2 matches
  return 2;
}

/**
 * Get all finals in Compass Draw
 *
 * @param compass - Compass Draw structure
 * @returns List of all final matches across all brackets
 */
export function getAllFinals(compass: CompassDrawStructure): {
  bracket: string;
  match: Omit<Match, 'id' | 'court_id'>;
}[] {
  const finals: { bracket: string; match: Omit<Match, 'id' | 'court_id'> }[] = [];

  // Main final
  const mainFinal = compass.mainDraw.rounds[compass.mainDraw.rounds.length - 1];
  if (mainFinal?.matches[0]) {
    finals.push({
      bracket: 'Main Draw',
      match: mainFinal.matches[0],
    });
  }

  // Consolation finals
  for (const [name, bracket] of Object.entries(compass.consolationBrackets)) {
    if (bracket && bracket.rounds.length > 0) {
      const consolationFinal = bracket.rounds[bracket.rounds.length - 1];
      if (consolationFinal?.matches[0]) {
        finals.push({
          bracket: name,
          match: consolationFinal.matches[0],
        });
      }
    }
  }

  return finals;
}
