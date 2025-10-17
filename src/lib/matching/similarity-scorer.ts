/**
 * Similarity Scorer - Calculate player compatibility
 *
 * Combines multiple signals to score player compatibility:
 * - Skill level match
 * - Location proximity
 * - Schedule compatibility
 * - Play style compatibility
 * - Social connections
 * - Semantic similarity (embeddings)
 */

import type { UserFeatures } from '../recommendations/types';
import { calculateUserSimilarity } from '../recommendations/collaborative-filtering';
import { DEFAULT_CF_CONFIG } from '../recommendations/types';
import { embeddingsService } from '../ai/embeddings';

// ============================================================================
// Compatibility Score Calculation
// ============================================================================

export interface CompatibilityScore {
  user_a_id: string;
  user_b_id: string;
  overall_score: number; // 0-1
  breakdown: {
    skill_match: number;
    location_match: number;
    schedule_match: number;
    play_style_match: number;
    social_match: number;
    semantic_match: number;
  };
  recommendation: 'strong_match' | 'good_match' | 'potential_match' | 'weak_match';
}

export interface MatchConfig {
  weights: {
    skill: number;
    location: number;
    schedule: number;
    play_style: number;
    social: number;
    semantic: number;
  };
  thresholds: {
    strong_match: number; // >=0.8
    good_match: number; // >=0.6
    potential_match: number; // >=0.4
  };
  use_embeddings: boolean;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: {
    skill: 0.25,
    location: 0.20,
    schedule: 0.20,
    play_style: 0.15,
    social: 0.10,
    semantic: 0.10, // Only if embeddings enabled
  },
  thresholds: {
    strong_match: 0.8,
    good_match: 0.6,
    potential_match: 0.4,
  },
  use_embeddings: true,
};

/**
 * Calculate comprehensive compatibility score
 */
export async function calculateCompatibilityScore(
  userA: UserFeatures,
  userB: UserFeatures,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): Promise<CompatibilityScore> {
  // Use existing collaborative filtering similarity calculation
  const cfSimilarity = calculateUserSimilarity(userA, userB, DEFAULT_CF_CONFIG);

  // Extract individual scores
  const breakdown = {
    skill_match: cfSimilarity.breakdown.skill_similarity,
    location_match: cfSimilarity.breakdown.location_proximity,
    schedule_match: cfSimilarity.breakdown.schedule_compatibility,
    play_style_match: cfSimilarity.breakdown.play_style_match,
    social_match: cfSimilarity.breakdown.social_overlap,
    semantic_match: 0, // Will be calculated if enabled
  };

  // Calculate semantic similarity if enabled and configured
  if (config.use_embeddings && embeddingsService.isConfigured()) {
    try {
      const semanticSim = await embeddingsService.calculateUserSimilarity(
        userA.user_id,
        userB.user_id
      );
      breakdown.semantic_match = semanticSim.similarity;
    } catch (error) {
      console.warn('[Similarity Scorer] Semantic similarity failed:', error);
      // Fallback: don't include semantic in score
      breakdown.semantic_match = 0;
    }
  }

  // Calculate weighted overall score
  const overall_score =
    breakdown.skill_match * config.weights.skill +
    breakdown.location_match * config.weights.location +
    breakdown.schedule_match * config.weights.schedule +
    breakdown.play_style_match * config.weights.play_style +
    breakdown.social_match * config.weights.social +
    breakdown.semantic_match * config.weights.semantic;

  // Determine recommendation level
  let recommendation: CompatibilityScore['recommendation'];
  if (overall_score >= config.thresholds.strong_match) {
    recommendation = 'strong_match';
  } else if (overall_score >= config.thresholds.good_match) {
    recommendation = 'good_match';
  } else if (overall_score >= config.thresholds.potential_match) {
    recommendation = 'potential_match';
  } else {
    recommendation = 'weak_match';
  }

  return {
    user_a_id: userA.user_id,
    user_b_id: userB.user_id,
    overall_score,
    breakdown,
    recommendation,
  };
}

/**
 * Batch calculate compatibility scores
 */
export async function batchCalculateCompatibility(
  targetUser: UserFeatures,
  candidateUsers: UserFeatures[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): Promise<CompatibilityScore[]> {
  // Calculate in parallel
  const scores = await Promise.all(
    candidateUsers.map((candidate) =>
      calculateCompatibilityScore(targetUser, candidate, config)
    )
  );

  // Sort by score descending
  return scores.sort((a, b) => b.overall_score - a.overall_score);
}

/**
 * Find best matches above threshold
 */
export async function findBestMatches(
  targetUser: UserFeatures,
  candidateUsers: UserFeatures[],
  minScore: number = 0.6,
  limit: number = 10,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): Promise<CompatibilityScore[]> {
  const scores = await batchCalculateCompatibility(targetUser, candidateUsers, config);

  return scores.filter((s) => s.overall_score >= minScore).slice(0, limit);
}
