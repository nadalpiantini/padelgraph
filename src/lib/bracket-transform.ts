/**
 * Bracket Data Transformation Utilities
 *
 * Transforms tournament bracket data from our API format
 * into a structure optimized for visualization
 */

import type {
  TournamentMatch,
  TournamentBracket
} from '@/types/database';

export interface BracketParticipant {
  id: string;
  name: string;
  score?: number;
  isWinner: boolean;
}

export interface BracketMatchNode {
  id: string;
  round: number;
  position: number;
  team1: BracketParticipant | null;
  team2: BracketParticipant | null;
  status: string;
  scheduledAt?: string;
  nextMatchId?: string;
  nextLooserMatchId?: string;
}

export interface BracketStructure {
  type: 'single' | 'double';
  upper: BracketMatchNode[];
  lower?: BracketMatchNode[];
  rounds: number;
}

/**
 * Transform API bracket data into visualization structure
 */
export function transformBracketData(
  brackets: TournamentBracket[],
  matches: (TournamentMatch & {
    tournament_round?: { round_number: number }
  })[],
  tournamentType: string
): BracketStructure {
  const isDouble = tournamentType === 'knockout_double';

  // Group brackets by type
  // For double elimination: 'main' is upper bracket, 'losers' is lower bracket
  // For single elimination: 'main' is the only bracket
  const upperBrackets = brackets.filter(b =>
    b.bracket_type === 'main'
  );
  const lowerBrackets = brackets.filter(b =>
    b.bracket_type === 'losers'
  );

  // Transform upper bracket
  const upper = transformBracketMatches(upperBrackets, matches);

  // Transform lower bracket if double elimination
  const lower = isDouble
    ? transformBracketMatches(lowerBrackets, matches)
    : undefined;

  // Calculate total rounds
  const rounds = Math.max(
    ...upperBrackets.map(b => b.round_number),
    ...(lowerBrackets.length > 0 ? lowerBrackets.map(b => b.round_number) : [0])
  );

  return {
    type: isDouble ? 'double' : 'single',
    upper,
    lower,
    rounds
  };
}

/**
 * Transform bracket positions into match nodes
 */
function transformBracketMatches(
  brackets: TournamentBracket[],
  matches: (TournamentMatch & {
    tournament_round?: { round_number: number }
  })[]
): BracketMatchNode[] {
  return brackets.map(bracket => {
    const match = matches.find(m => m.id === bracket.match_id);

    // Find next match for progression
    const nextBracket = brackets.find(b =>
      b.winner_from_match_id === bracket.match_id
    );

    // Find loser destination (for double elimination)
    const looserBracket = brackets.find(b =>
      b.loser_from_match_id === bracket.match_id
    );

    return {
      id: bracket.match_id || `empty-${bracket.id}`,
      round: bracket.round_number,
      position: bracket.position,
      team1: match ? {
        id: `${match.team1_player1_id}-${match.team1_player2_id}`,
        name: 'Team 1', // Will be populated with real names
        score: match.team1_score,
        isWinner: match.winner_team === 1
      } : null,
      team2: match ? {
        id: `${match.team2_player1_id}-${match.team2_player2_id}`,
        name: 'Team 2', // Will be populated with real names
        score: match.team2_score,
        isWinner: match.winner_team === 2
      } : null,
      status: match?.status || 'pending',
      scheduledAt: match?.scheduled_at,
      nextMatchId: nextBracket?.match_id,
      nextLooserMatchId: looserBracket?.match_id
    };
  });
}

/**
 * Calculate bracket layout dimensions
 */
export function calculateBracketLayout(structure: BracketStructure) {
  const matchWidth = 240;
  const matchHeight = 80;
  const horizontalGap = 100;
  const verticalGap = 20;

  // Calculate matches per round for proper spacing
  const upperMatchesByRound = new Map<number, number>();
  structure.upper.forEach(match => {
    const count = upperMatchesByRound.get(match.round) || 0;
    upperMatchesByRound.set(match.round, count + 1);
  });

  const lowerMatchesByRound = new Map<number, number>();
  structure.lower?.forEach(match => {
    const count = lowerMatchesByRound.get(match.round) || 0;
    lowerMatchesByRound.set(match.round, count + 1);
  });

  const maxUpperMatches = Math.max(...Array.from(upperMatchesByRound.values()));
  const maxLowerMatches = structure.lower
    ? Math.max(...Array.from(lowerMatchesByRound.values()))
    : 0;

  const width = (structure.rounds * (matchWidth + horizontalGap)) + horizontalGap;
  const upperHeight = (maxUpperMatches * matchHeight) + ((maxUpperMatches + 1) * verticalGap);
  const lowerHeight = maxLowerMatches > 0
    ? (maxLowerMatches * matchHeight) + ((maxLowerMatches + 1) * verticalGap)
    : 0;

  const height = upperHeight + lowerHeight + (lowerHeight > 0 ? 60 : 0); // Extra gap between brackets

  return {
    width,
    height,
    matchWidth,
    matchHeight,
    horizontalGap,
    verticalGap,
    upperHeight,
    lowerHeight
  };
}

/**
 * Calculate match position coordinates
 */
export function getMatchPosition(
  match: BracketMatchNode,
  layout: ReturnType<typeof calculateBracketLayout>,
  totalMatchesInRound: number,
  matchIndexInRound: number,
  isLowerBracket: boolean = false
): { x: number; y: number } {
  const { matchWidth, matchHeight, horizontalGap, verticalGap, upperHeight } = layout;

  const x = (match.round - 1) * (matchWidth + horizontalGap) + horizontalGap;

  // Calculate vertical spacing to center matches
  const totalHeight = (totalMatchesInRound * matchHeight) + ((totalMatchesInRound - 1) * verticalGap);
  const startY = isLowerBracket
    ? upperHeight + 60 // Gap between upper and lower brackets
    : 0;

  const y = startY + ((matchHeight + verticalGap) * matchIndexInRound) + verticalGap;

  return { x, y };
}
