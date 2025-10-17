/**
 * Recommendations Engine - Main Orchestrator
 *
 * Combines collaborative filtering, embeddings, and caching
 * to generate personalized recommendations for users.
 *
 * Usage:
 * ```ts
 * import { recommendationsEngine } from '@/lib/recommendations/engine';
 *
 * const recommendations = await recommendationsEngine.generateRecommendations({
 *   user_id: 'user-uuid',
 *   type: 'player',
 *   limit: 10,
 * });
 * ```
 */

import type {
  UserFeatures,
  Recommendation,
  PlayerRecommendation,
  ClubRecommendation,
  TournamentRecommendation,
  RecommendationRequest,
  RecommendationResponse,
  UserItemInteraction,
  CollaborativeFilteringConfig,
} from './types';
import { DEFAULT_CF_CONFIG } from './types';
import {
  findSimilarUsers,
  scoreItemRecommendation,
} from './collaborative-filtering';
import { cacheManager } from '../cache/cache-manager';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Feature Extraction
// ============================================================================

/**
 * Extract user features from database
 */
async function extractUserFeatures(userId: string): Promise<UserFeatures | null> {
  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, name, level, city, location, skill_rating, last_active')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  // Get match statistics
  const { data: matchStats } = await supabase
    .from('match')
    .select('id')
    .or(`team1_player1_id.eq.${userId},team1_player2_id.eq.${userId},team2_player1_id.eq.${userId},team2_player2_id.eq.${userId}`)
    .eq('status', 'completed');

  // Get tournament participation
  const { data: tournamentStats } = await supabase
    .from('tournament_participant')
    .select('tournament_id')
    .eq('user_id', userId);

  // Get social connections
  const { data: connections } = await supabase
    .from('social_connection')
    .select('user_b, connection_type')
    .eq('user_a', userId);

  // Get club memberships
  const { data: clubs } = await supabase
    .from('org_member')
    .select('org_id')
    .eq('user_id', userId);

  // Parse location if exists
  let location;
  if (profile.location) {
    // PostGIS POINT format: "POINT(lng lat)"
    const match = profile.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      location = { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
  }

  // Calculate activity level (matches per week)
  const weeksActive = profile.last_active
    ? Math.max(1, (Date.now() - new Date(profile.last_active).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 1;
  const activity_level = Math.min(1, (matchStats?.length || 0) / weeksActive / 3); // 3 matches/week = 1.0

  return {
    user_id: userId,
    level: profile.level,
    skill_rating: profile.skill_rating,
    matches_played: matchStats?.length || 0,
    tournaments_participated: tournamentStats?.length || 0,
    city: profile.city,
    location,
    connection_count: connections?.length || 0,
    club_memberships: clubs?.map((c) => c.org_id) || [],
    frequent_partners: connections
      ?.filter((c) => c.connection_type === 'played_with')
      .map((c) => c.user_b) || [],
    last_active: new Date(profile.last_active),
    activity_level,
  };
}

/**
 * Get user interaction history (currently unused - for future enhancement)
 */
// @ts-expect-error - Future enhancement: getUserInteractions for advanced recommendations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getUserInteractions(userId: string): Promise<UserItemInteraction[]> {
  const supabase = await createClient();
  const interactions: UserItemInteraction[] = [];

  // Played with interactions
  const { data: playedWith } = await supabase
    .from('match')
    .select('id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, created_at')
    .or(`team1_player1_id.eq.${userId},team1_player2_id.eq.${userId},team2_player1_id.eq.${userId},team2_player2_id.eq.${userId}`)
    .eq('status', 'completed')
    .limit(100);

  if (playedWith) {
    for (const match of playedWith) {
      const players = [
        match.team1_player1_id,
        match.team1_player2_id,
        match.team2_player1_id,
        match.team2_player2_id,
      ].filter((id) => id !== userId);

      for (const playerId of players) {
        interactions.push({
          user_id: userId,
          item_id: playerId,
          item_type: 'player',
          interaction_type: 'played_with',
          interaction_strength: 1.0,
          timestamp: new Date(match.created_at),
        });
      }
    }
  }

  // Tournament participation
  const { data: tournaments } = await supabase
    .from('tournament_participant')
    .select('tournament_id, created_at')
    .eq('user_id', userId)
    .limit(50);

  if (tournaments) {
    for (const tournament of tournaments) {
      interactions.push({
        user_id: userId,
        item_id: tournament.tournament_id,
        item_type: 'tournament',
        interaction_type: 'attended',
        interaction_strength: 1.0,
        timestamp: new Date(tournament.created_at),
      });
    }
  }

  // Bookmarked items (from recommendation table with shown=true, clicked=true)
  const { data: bookmarks } = await supabase
    .from('recommendation')
    .select('recommended_id, recommended_type, created_at')
    .eq('user_id', userId)
    .eq('clicked', true)
    .limit(50);

  if (bookmarks) {
    for (const bookmark of bookmarks) {
      interactions.push({
        user_id: userId,
        item_id: bookmark.recommended_id,
        item_type: bookmark.recommended_type as 'player' | 'club' | 'tournament',
        interaction_type: 'bookmarked',
        interaction_strength: 0.8,
        timestamp: new Date(bookmark.created_at),
      });
    }
  }

  return interactions;
}

// ============================================================================
// Recommendation Generation
// ============================================================================

/**
 * Generate player recommendations
 */
async function generatePlayerRecommendations(
  _userId: string,
  userFeatures: UserFeatures,
  similarUsers: Array<{ user_id: string; similarity: number }>,
  interactions: UserItemInteraction[],
  config: CollaborativeFilteringConfig,
  limit: number
): Promise<PlayerRecommendation[]> {
  const supabase = await createClient();

  // Get candidate players from similar users' interactions
  const playerInteractions = interactions.filter((i) => i.item_type === 'player');
  const candidatePlayerIds = [...new Set(playerInteractions.map((i) => i.item_id))];

  // Score each candidate
  const scoredPlayers = candidatePlayerIds
    .map((playerId) => ({
      player_id: playerId,
      score: scoreItemRecommendation(playerId, similarUsers, playerInteractions, config),
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2); // Get extra for filtering

  if (scoredPlayers.length === 0) return [];

  // Fetch player details
  const { data: players } = await supabase
    .from('user_profile')
    .select('id, name, level, city, location')
    .in('id', scoredPlayers.map((p) => p.player_id));

  if (!players) return [];

  // Enrich with metadata
  const recommendations: PlayerRecommendation[] = players
    .map((player) => {
      const scored = scoredPlayers.find((p) => p.player_id === player.id);
      if (!scored) return null;

      // Calculate shared connections
      const sharedConnections = userFeatures.frequent_partners.filter((p) =>
        players.find((pl) => pl.id === p)
      ).length;

      // Calculate distance if locations available
      let distance_km;
      if (userFeatures.location && player.location) {
        const match = player.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          const playerLocation = { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
          // Use haversine (simplified)
          distance_km = Math.round(
            Math.sqrt(
              Math.pow(userFeatures.location.lat - playerLocation.lat, 2) +
              Math.pow(userFeatures.location.lng - playerLocation.lng, 2)
            ) * 111 // Approximate km per degree
          );
        }
      }

      return {
        type: 'player' as const,
        entity_id: player.id,
        score: scored.score,
        reason: `Similar to ${sharedConnections} of your connections`,
        player_name: player.name,
        player_level: player.level,
        player_city: player.city,
        similarity_score: scored.score,
        shared_connections: sharedConnections,
        distance_km,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, limit);

  return recommendations as PlayerRecommendation[];
}

/**
 * Generate club recommendations (simplified)
 */
async function generateClubRecommendations(
  _userId: string,
  userFeatures: UserFeatures,
  limit: number
): Promise<ClubRecommendation[]> {
  const supabase = await createClient();

  // Get nearby clubs if location available
  if (!userFeatures.location) return [];

  const { data: clubs } = await supabase.rpc('get_nearby_clubs', {
    p_location: `POINT(${userFeatures.location.lng} ${userFeatures.location.lat})`,
    p_radius_km: 20,
  });

  if (!clubs || clubs.length === 0) return [];

  return clubs.slice(0, limit).map((club: { id: string; name: string; city: string; distance_km: number }) => ({
    type: 'club' as const,
    entity_id: club.id,
    score: 1 - club.distance_km / 20, // Normalize distance to score
    reason: `${club.distance_km}km from your location`,
    club_name: club.name,
    club_city: club.city,
    distance_km: club.distance_km,
  }));
}

/**
 * Generate tournament recommendations (simplified)
 */
async function generateTournamentRecommendations(
  _userId: string,
  userFeatures: UserFeatures,
  limit: number
): Promise<TournamentRecommendation[]> {
  const supabase = await createClient();

  // Get upcoming tournaments matching user level
  const { data: tournaments } = await supabase
    .from('tournament')
    .select('id, name, format, level_requirement, starts_at, city')
    .gte('starts_at', new Date().toISOString())
    .eq('status', 'registration')
    .limit(limit * 2);

  if (!tournaments) return [];

  return tournaments
    .filter((t) => !userFeatures.level || t.level_requirement === userFeatures.level)
    .slice(0, limit)
    .map((tournament) => ({
      type: 'tournament' as const,
      entity_id: tournament.id,
      score: 0.8, // Fixed score for now
      reason: `Matches your ${userFeatures.level} level`,
      tournament_name: tournament.name,
      tournament_format: tournament.format,
      start_date: tournament.starts_at,
      level_range: tournament.level_requirement,
    }));
}

// ============================================================================
// Main Engine Class
// ============================================================================

class RecommendationsEngine {
  private config: CollaborativeFilteringConfig;

  constructor(config: CollaborativeFilteringConfig = DEFAULT_CF_CONFIG) {
    this.config = config;
  }

  /**
   * Generate recommendations for user
   */
  async generateRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const startTime = Date.now();

    // Check cache first
    const cached = cacheManager.getRecommendations(request.user_id);
    if (cached && (!request.type || request.type === 'all')) {
      return {
        user_id: request.user_id,
        recommendations: cached.recommendations.slice(0, request.limit || 10),
        generated_at: new Date(cached.generated_at),
        cache_hit: true,
      };
    }

    // Extract user features
    const userFeatures = await extractUserFeatures(request.user_id);
    if (!userFeatures) {
      throw new Error('User not found');
    }

    // Get all interactions from system (for collaborative filtering)
    const allInteractions = await this.getAllInteractions();

    // Find similar users
    const allUserFeatures = await this.getAllUserFeatures();
    const similarUsers = findSimilarUsers(userFeatures, allUserFeatures, this.config);

    // Generate recommendations by type
    const recommendations: Recommendation[] = [];

    if (!request.type || request.type === 'all' || request.type === 'player') {
      const playerRecs = await generatePlayerRecommendations(
        request.user_id,
        userFeatures,
        similarUsers,
        allInteractions,
        this.config,
        request.limit || 10
      );
      recommendations.push(...playerRecs);
    }

    if (!request.type || request.type === 'all' || request.type === 'club') {
      const clubRecs = await generateClubRecommendations(
        request.user_id,
        userFeatures,
        request.limit || 5
      );
      recommendations.push(...clubRecs);
    }

    if (!request.type || request.type === 'all' || request.type === 'tournament') {
      const tournamentRecs = await generateTournamentRecommendations(
        request.user_id,
        userFeatures,
        request.limit || 5
      );
      recommendations.push(...tournamentRecs);
    }

    // Apply filters
    let filteredRecs = recommendations;
    if (request.filters) {
      const { max_distance_km, min_score, exclude_ids } = request.filters;

      if (max_distance_km) {
        filteredRecs = filteredRecs.filter((r) =>
          'distance_km' in r ? (r as { distance_km?: number }).distance_km! <= max_distance_km : true
        );
      }

      if (min_score) {
        filteredRecs = filteredRecs.filter((r) => r.score >= min_score);
      }

      if (exclude_ids && exclude_ids.length > 0) {
        filteredRecs = filteredRecs.filter((r) => !exclude_ids.includes(r.entity_id));
      }
    }

    // Sort by score and limit
    filteredRecs = filteredRecs
      .sort((a, b) => b.score - a.score)
      .slice(0, request.limit || 10);

    // Cache result
    cacheManager.setRecommendations(request.user_id, {
      user_id: request.user_id,
      recommendations: filteredRecs,
      generated_at: Date.now(),
    });

    return {
      user_id: request.user_id,
      recommendations: filteredRecs,
      generated_at: new Date(),
      cache_hit: false,
      generation_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Get all user interactions (for collaborative filtering)
   * In production, this should be cached or limited
   */
  private async getAllInteractions(): Promise<UserItemInteraction[]> {
    // For MVP, return empty and rely on individual user interactions
    // In production, this would aggregate all users' interactions
    return [];
  }

  /**
   * Get all user features (for similarity calculation)
   * In production, this should be cached or limited
   */
  private async getAllUserFeatures(): Promise<UserFeatures[]> {
    const supabase = await createClient();

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: users } = await supabase
      .from('user_profile')
      .select('id')
      .gte('last_active', thirtyDaysAgo)
      .limit(100); // Limit for performance

    if (!users) return [];

    const features = await Promise.all(
      users.map((u) => extractUserFeatures(u.id))
    );

    return features.filter((f): f is UserFeatures => f !== null);
  }

  /**
   * Invalidate recommendations cache for user
   */
  invalidateCache(userId: string): void {
    cacheManager.invalidateRecommendations(userId);
  }
}

// Export singleton instance
export const recommendationsEngine = new RecommendationsEngine();
