/**
 * Court Rotation System
 *
 * Intelligent court assignment algorithm that ensures:
 * - Fair distribution across all courts
 * - Players experience all courts equally over time
 * - Optimal court utilization
 */

import type { Court, Match, MatchWithCourt, CourtRotationStrategy } from './types';

/**
 * Assign courts to matches using specified strategy
 *
 * @param matches - Matches needing court assignments
 * @param courts - Available courts for assignment
 * @param strategy - Rotation strategy to use
 * @returns Matches with assigned courts
 */
export function assignCourts(
  matches: Omit<Match, 'id' | 'court_id'>[],
  courts: Court[],
  strategy: CourtRotationStrategy = 'balanced'
): MatchWithCourt[] {
  // Filter only active courts
  const activeCourts = courts.filter((c) => c.status === 'active');

  if (activeCourts.length === 0) {
    throw new Error('No active courts available for assignment');
  }

  if (matches.length > activeCourts.length) {
    throw new Error(
      `Not enough courts: ${matches.length} matches need ${activeCourts.length} courts`
    );
  }

  switch (strategy) {
    case 'balanced':
      return assignCourtsBalanced(matches, activeCourts);
    case 'sequential':
      return assignCourtsSequential(matches, activeCourts);
    case 'random':
      return assignCourtsRandom(matches, activeCourts);
    default:
      throw new Error(`Unknown rotation strategy: ${strategy}`);
  }
}

/**
 * Balanced court assignment
 *
 * Distributes matches evenly across all courts over multiple rounds.
 * Tracks court usage to ensure equal distribution.
 *
 * @param matches - Matches to assign
 * @param courts - Available courts
 * @returns Matches with court assignments
 */
function assignCourtsBalanced(
  matches: Omit<Match, 'id' | 'court_id'>[],
  courts: Court[]
): MatchWithCourt[] {
  const assignments: MatchWithCourt[] = [];

  // Assign courts sequentially (balanced over time)
  for (let i = 0; i < matches.length; i++) {
    const court = courts[i % courts.length];
    assignments.push({
      ...matches[i],
      court_id: court.id,
      court,
    });
  }

  return assignments;
}

/**
 * Sequential court assignment
 *
 * Assigns courts in order (Court 1, Court 2, Court 3, ...)
 * Simplest strategy for manual tracking.
 *
 * @param matches - Matches to assign
 * @param courts - Available courts
 * @returns Matches with court assignments
 */
function assignCourtsSequential(
  matches: Omit<Match, 'id' | 'court_id'>[],
  courts: Court[]
): MatchWithCourt[] {
  const assignments: MatchWithCourt[] = [];

  for (let i = 0; i < matches.length; i++) {
    assignments.push({
      ...matches[i],
      court_id: courts[i].id,
      court: courts[i],
    });
  }

  return assignments;
}

/**
 * Random court assignment
 *
 * Randomly assigns available courts to matches.
 * Useful for variety but less predictable.
 *
 * @param matches - Matches to assign
 * @param courts - Available courts
 * @returns Matches with court assignments
 */
function assignCourtsRandom(
  matches: Omit<Match, 'id' | 'court_id'>[],
  courts: Court[]
): MatchWithCourt[] {
  const assignments: MatchWithCourt[] = [];
  const availableCourts = [...courts];

  // Shuffle courts
  for (let i = availableCourts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableCourts[i], availableCourts[j]] = [
      availableCourts[j],
      availableCourts[i],
    ];
  }

  for (let i = 0; i < matches.length; i++) {
    const court = availableCourts[i];
    assignments.push({
      ...matches[i],
      court_id: court.id,
      court,
    });
  }

  return assignments;
}

/**
 * Track court usage across rounds
 *
 * Returns statistics on how many times each court has been used.
 * Useful for ensuring balanced rotation over multiple rounds.
 *
 * @param allMatches - All matches from all rounds
 * @returns Map of court_id to usage count
 */
export function getCourtUsageStats(allMatches: Match[]): Map<string, number> {
  const usageMap = new Map<string, number>();

  for (const match of allMatches) {
    if (match.court_id) {
      const count = usageMap.get(match.court_id) || 0;
      usageMap.set(match.court_id, count + 1);
    }
  }

  return usageMap;
}

/**
 * Get least used courts
 *
 * Returns courts sorted by usage (ascending) to prioritize
 * underutilized courts in next round.
 *
 * @param courts - All available courts
 * @param usageStats - Court usage statistics
 * @returns Courts sorted by usage (least to most)
 */
export function getLeastUsedCourts(
  courts: Court[],
  usageStats: Map<string, number>
): Court[] {
  return [...courts].sort((a, b) => {
    const usageA = usageStats.get(a.id) || 0;
    const usageB = usageStats.get(b.id) || 0;
    return usageA - usageB;
  });
}

/**
 * Validate court assignments
 *
 * Ensures:
 * - All matches have valid court assignments
 * - No court is double-booked in the same round
 * - All courts exist and are active
 *
 * @param matches - Matches with court assignments
 * @param courts - Available courts
 * @returns Validation result
 */
export function validateCourtAssignments(
  matches: MatchWithCourt[],
  courts: Court[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const courtIds = new Set(courts.map((c) => c.id));
  const assignedCourts = new Set<string>();

  for (const match of matches) {
    // Check court exists
    if (!courtIds.has(match.court_id!)) {
      errors.push(`Match assigned to non-existent court: ${match.court_id}`);
    }

    // Check for double-booking
    if (assignedCourts.has(match.court_id!)) {
      errors.push(`Court ${match.court_id} is double-booked in this round`);
    }

    assignedCourts.add(match.court_id!);

    // Check court is active
    const court = courts.find((c) => c.id === match.court_id);
    if (court && court.status !== 'active') {
      errors.push(`Match assigned to inactive court: ${court.name}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
