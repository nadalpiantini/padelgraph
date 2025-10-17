/**
 * Recommendations Engine - Type Definitions
 *
 * Types for collaborative filtering and recommendation generation
 */

// ============================================================================
// User Feature Vector
// ============================================================================

export interface UserFeatures {
  user_id: string;

  // Skill & Experience
  level?: string; // 'beginner' | 'intermediate' | 'advanced' | 'professional'
  skill_rating?: number; // 0-1000
  matches_played: number;
  tournaments_participated: number;

  // Location
  city?: string;
  location?: {
    lat: number;
    lng: number;
  };

  // Play Style (from match history)
  play_style?: {
    aggressive: number; // 0-1
    defensive: number; // 0-1
    consistent: number; // 0-1
    strategic: number; // 0-1
  };

  // Preferences
  preferred_format?: string; // 'singles' | 'doubles' | 'mixed'
  preferred_time_slot?: string; // 'morning' | 'afternoon' | 'evening'
  availability_days?: string[]; // ['monday', 'wednesday', ...]

  // Social
  connection_count: number;
  club_memberships: string[];
  frequent_partners: string[];

  // Activity
  last_active: Date;
  activity_level: number; // 0-1 (matches per week normalized)
}

// ============================================================================
// Recommendation Types
// ============================================================================

export type RecommendationType = 'player' | 'club' | 'tournament';

export interface Recommendation {
  type: RecommendationType;
  entity_id: string;
  score: number; // 0-1 relevance score
  reason: string; // Human-readable explanation
  metadata?: Record<string, unknown>;
}

export interface PlayerRecommendation extends Recommendation {
  type: 'player';
  player_name?: string;
  player_level?: string;
  player_city?: string;
  similarity_score: number;
  shared_connections: number;
  distance_km?: number;
}

export interface ClubRecommendation extends Recommendation {
  type: 'club';
  club_name?: string;
  club_city?: string;
  distance_km?: number;
  member_count?: number;
  avg_level?: string;
}

export interface TournamentRecommendation extends Recommendation {
  type: 'tournament';
  tournament_name?: string;
  tournament_format?: string;
  start_date?: string;
  distance_km?: number;
  participants_count?: number;
  level_range?: string;
}

// ============================================================================
// Similarity Metrics
// ============================================================================

export interface SimilarityScore {
  user_a: string;
  user_b: string;
  overall_similarity: number; // 0-1 weighted average
  breakdown: {
    skill_similarity: number; // 0-1
    location_proximity: number; // 0-1 (normalized distance)
    play_style_match: number; // 0-1
    schedule_compatibility: number; // 0-1
    social_overlap: number; // 0-1 (shared connections)
  };
}

// ============================================================================
// Collaborative Filtering Types
// ============================================================================

export interface UserItemInteraction {
  user_id: string;
  item_id: string; // player, club, or tournament ID
  item_type: RecommendationType;
  interaction_type: 'played_with' | 'bookmarked' | 'attended' | 'joined';
  interaction_strength: number; // 0-1 (frequency/recency weighted)
  timestamp: Date;
}

export interface UserSimilarityMatrix {
  user_id: string;
  similar_users: Array<{
    user_id: string;
    similarity: number;
  }>;
}

// ============================================================================
// Recommendation Request/Response
// ============================================================================

export interface RecommendationRequest {
  user_id: string;
  type?: RecommendationType | 'all';
  limit?: number;
  filters?: {
    max_distance_km?: number;
    min_score?: number;
    level?: string;
    exclude_ids?: string[];
  };
  include_reason?: boolean;
}

export interface RecommendationResponse {
  user_id: string;
  recommendations: Recommendation[];
  generated_at: Date;
  cache_hit: boolean;
  generation_time_ms?: number;
}

// ============================================================================
// Algorithm Configuration
// ============================================================================

export interface CollaborativeFilteringConfig {
  // User-user similarity
  similarity_threshold: number; // Min similarity to consider (0-1)
  max_similar_users: number; // Top K similar users to use

  // Feature weights
  weights: {
    skill: number;
    location: number;
    play_style: number;
    schedule: number;
    social: number;
  };

  // Scoring
  min_interactions: number; // Min interactions to include item
  decay_factor: number; // Recency decay for interactions (0-1)

  // Performance
  cache_ttl_hours: number;
  batch_size: number;
}

export const DEFAULT_CF_CONFIG: CollaborativeFilteringConfig = {
  similarity_threshold: 0.3,
  max_similar_users: 50,
  weights: {
    skill: 0.3,
    location: 0.25,
    play_style: 0.2,
    schedule: 0.15,
    social: 0.1,
  },
  min_interactions: 2,
  decay_factor: 0.95,
  cache_ttl_hours: 24,
  batch_size: 100,
};
