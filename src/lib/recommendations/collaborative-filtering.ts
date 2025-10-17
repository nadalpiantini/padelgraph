/**
 * Collaborative Filtering Algorithm
 *
 * User-user collaborative filtering for recommendations:
 * 1. Calculate user similarity based on features
 * 2. Find K most similar users
 * 3. Recommend items those similar users interacted with
 * 4. Score based on similarity * interaction strength
 */

import type {
  UserFeatures,
  SimilarityScore,
  UserItemInteraction,
  CollaborativeFilteringConfig,
} from './types';

// ============================================================================
// Similarity Calculation
// ============================================================================

/**
 * Calculate cosine similarity for vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Jaccard similarity for sets
 */
export function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 1;
  if (setA.length === 0 || setB.length === 0) return 0;

  const intersection = setA.filter((item) => setB.includes(item)).length;
  const union = new Set([...setA, ...setB]).size;

  return intersection / union;
}

/**
 * Calculate skill similarity (0-1)
 */
export function skillSimilarity(userA: UserFeatures, userB: UserFeatures): number {
  // Use rating if available, fallback to level comparison
  if (userA.skill_rating !== undefined && userB.skill_rating !== undefined) {
    const diff = Math.abs(userA.skill_rating - userB.skill_rating);
    const maxDiff = 1000; // Max rating range
    return 1 - diff / maxDiff;
  }

  // Level-based comparison
  const levels = ['beginner', 'intermediate', 'advanced', 'professional'];
  const levelA = levels.indexOf(userA.level || 'intermediate');
  const levelB = levels.indexOf(userB.level || 'intermediate');

  const diff = Math.abs(levelA - levelB);
  return 1 - diff / (levels.length - 1);
}

/**
 * Calculate location proximity (0-1)
 * Uses Haversine formula for distance
 */
export function locationProximity(userA: UserFeatures, userB: UserFeatures): number {
  if (!userA.location || !userB.location) {
    // Fallback to city comparison
    if (userA.city && userB.city) {
      return userA.city === userB.city ? 1 : 0.3;
    }
    return 0.5; // Unknown location
  }

  const distance = haversineDistance(
    userA.location.lat,
    userA.location.lng,
    userB.location.lat,
    userB.location.lng
  );

  // Normalize: 0km = 1.0, 50km+ = 0.0
  const maxDistance = 50;
  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * Haversine distance calculation (km)
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate play style similarity (0-1)
 */
export function playStyleMatch(userA: UserFeatures, userB: UserFeatures): number {
  if (!userA.play_style || !userB.play_style) {
    return 0.5; // Unknown style
  }

  const styleA = [
    userA.play_style.aggressive,
    userA.play_style.defensive,
    userA.play_style.consistent,
    userA.play_style.strategic,
  ];

  const styleB = [
    userB.play_style.aggressive,
    userB.play_style.defensive,
    userB.play_style.consistent,
    userB.play_style.strategic,
  ];

  return cosineSimilarity(styleA, styleB);
}

/**
 * Calculate schedule compatibility (0-1)
 */
export function scheduleCompatibility(userA: UserFeatures, userB: UserFeatures): number {
  // Time slot match
  let timeMatch = 0.5;
  if (userA.preferred_time_slot && userB.preferred_time_slot) {
    timeMatch = userA.preferred_time_slot === userB.preferred_time_slot ? 1 : 0.3;
  }

  // Availability days overlap
  let daysMatch = 0.5;
  if (userA.availability_days && userB.availability_days) {
    daysMatch = jaccardSimilarity(userA.availability_days, userB.availability_days);
  }

  return (timeMatch + daysMatch) / 2;
}

/**
 * Calculate social overlap (0-1)
 */
export function socialOverlap(userA: UserFeatures, userB: UserFeatures): number {
  // Club memberships overlap
  const clubMatch = jaccardSimilarity(userA.club_memberships, userB.club_memberships);

  // Shared connections (mutual friends)
  const connectionMatch = jaccardSimilarity(
    userA.frequent_partners,
    userB.frequent_partners
  );

  return (clubMatch + connectionMatch) / 2;
}

// ============================================================================
// Main Similarity Function
// ============================================================================

/**
 * Calculate comprehensive user similarity
 */
export function calculateUserSimilarity(
  userA: UserFeatures,
  userB: UserFeatures,
  config: CollaborativeFilteringConfig
): SimilarityScore {
  const breakdown = {
    skill_similarity: skillSimilarity(userA, userB),
    location_proximity: locationProximity(userA, userB),
    play_style_match: playStyleMatch(userA, userB),
    schedule_compatibility: scheduleCompatibility(userA, userB),
    social_overlap: socialOverlap(userA, userB),
  };

  // Weighted average
  const overall_similarity =
    breakdown.skill_similarity * config.weights.skill +
    breakdown.location_proximity * config.weights.location +
    breakdown.play_style_match * config.weights.play_style +
    breakdown.schedule_compatibility * config.weights.schedule +
    breakdown.social_overlap * config.weights.social;

  return {
    user_a: userA.user_id,
    user_b: userB.user_id,
    overall_similarity,
    breakdown,
  };
}

// ============================================================================
// Recommendation Scoring
// ============================================================================

/**
 * Calculate interaction strength with recency decay
 */
export function calculateInteractionStrength(
  interaction: UserItemInteraction,
  config: CollaborativeFilteringConfig
): number {
  // Base strength from interaction type
  const baseStrength = {
    played_with: 1.0,
    attended: 0.8,
    joined: 0.7,
    bookmarked: 0.5,
  }[interaction.interaction_type] || 0.5;

  // Recency decay (exponential)
  const daysSince = (Date.now() - interaction.timestamp.getTime()) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.pow(config.decay_factor, daysSince);

  return baseStrength * recencyFactor * interaction.interaction_strength;
}

/**
 * Score item recommendation based on similar users' interactions
 */
export function scoreItemRecommendation(
  itemId: string,
  similarUsers: Array<{ user_id: string; similarity: number }>,
  interactions: UserItemInteraction[],
  config: CollaborativeFilteringConfig
): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Filter interactions for this item
  const itemInteractions = interactions.filter((i) => i.item_id === itemId);

  // Must have minimum interactions
  if (itemInteractions.length < config.min_interactions) {
    return 0;
  }

  // Calculate weighted score from similar users
  for (const similarUser of similarUsers) {
    const userInteractions = itemInteractions.filter(
      (i) => i.user_id === similarUser.user_id
    );

    for (const interaction of userInteractions) {
      const strength = calculateInteractionStrength(interaction, config);
      const weight = similarUser.similarity;

      totalScore += strength * weight;
      totalWeight += weight;
    }
  }

  // Normalize by total weight
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Find K most similar users
 */
export function findSimilarUsers(
  targetUser: UserFeatures,
  allUsers: UserFeatures[],
  config: CollaborativeFilteringConfig
): Array<{ user_id: string; similarity: number }> {
  const similarities = allUsers
    .filter((u) => u.user_id !== targetUser.user_id)
    .map((u) => {
      const sim = calculateUserSimilarity(targetUser, u, config);
      return {
        user_id: u.user_id,
        similarity: sim.overall_similarity,
      };
    })
    .filter((s) => s.similarity >= config.similarity_threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, config.max_similar_users);

  return similarities;
}
