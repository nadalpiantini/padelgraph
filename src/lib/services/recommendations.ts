/**
 * Recommendations Engine
 * Collaborative filtering + OpenAI embeddings for personalized recommendations
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

// Initialize OpenAI (will use env var OPENAI_API_KEY)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface RecommendationInput {
  user_id: string;
  type: 'players' | 'clubs' | 'tournaments';
  limit?: number;
}

export interface RecommendationResult {
  id: string;
  type: 'player' | 'club' | 'tournament';
  recommended_id: string;
  score: number;
  reason: string;
  metadata: Record<string, unknown>;
}

/**
 * Calculate user similarity based on common features
 */
async function calculateUserSimilarity(
  userId: string,
  targetUserId: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<number> {
  // Fetch both user profiles
  const { data: users } = await supabase
    .from('user_profile')
    .select('id, skill_level, city, preferences')
    .in('id', [userId, targetUserId]);

  if (!users || users.length !== 2) return 0;

  const [user, target] = users;
  let score = 0;

  // Same skill level: +0.3
  if (user.skill_level === target.skill_level) {
    score += 0.3;
  }

  // Same city: +0.2
  if (user.city === target.city) {
    score += 0.2;
  }

  // Common connections: +0.3
  const { count: commonConnections } = await supabase
    .from('social_connection')
    .select('*', { count: 'exact', head: true })
    .or(
      `and(user_a.eq.${userId},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${userId})`
    );

  if (commonConnections && commonConnections > 0) {
    score += 0.3;
  }

  // Played together in tournaments: +0.2
  const { count: commonTournaments } = await supabase.rpc('count_common_tournaments', {
    user1_id: userId,
    user2_id: targetUserId,
  });

  if (commonTournaments && commonTournaments > 0) {
    score += 0.2;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Generate player recommendations using collaborative filtering
 */
async function recommendPlayers(
  userId: string,
  limit: number,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<RecommendationResult[]> {
  // 1. Get user's connections (friends)
  const { data: connections } = await supabase
    .from('social_connection')
    .select('user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  const friendIds = new Set(
    connections?.map((c) => (c.user_a === userId ? c.user_b : c.user_a)) || []
  );

  // 2. Get user profile
  const { data: userProfile } = await supabase
    .from('user_profile')
    .select('skill_level, city, location')
    .eq('id', userId)
    .single();

  if (!userProfile) return [];

  // 3. Find similar users (collaborative filtering)
  const { data: candidateUsers } = await supabase
    .from('user_profile')
    .select('id, display_name, skill_level, city')
    .neq('id', userId)
    .limit(50); // Get more candidates for better recommendations

  if (!candidateUsers) return [];

  // 4. Calculate similarity scores
  const recommendations: RecommendationResult[] = [];

  for (const candidate of candidateUsers) {
    // Skip if already friends
    if (friendIds.has(candidate.id)) continue;

    const similarity = await calculateUserSimilarity(userId, candidate.id, supabase);

    if (similarity > 0.4) {
      // Threshold for recommendation
      let reason = 'Jugador compatible encontrado';

      if (candidate.skill_level === userProfile.skill_level) {
        reason = `Mismo nivel de juego (${candidate.skill_level})`;
      } else if (candidate.city === userProfile.city) {
        reason = `Jugador de ${candidate.city}`;
      }

      recommendations.push({
        id: crypto.randomUUID(),
        type: 'player',
        recommended_id: candidate.id,
        score: similarity,
        reason,
        metadata: {
          display_name: candidate.display_name,
          skill_level: candidate.skill_level,
          city: candidate.city,
        },
      });
    }
  }

  // 5. Sort by score and limit
  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Generate club recommendations based on location and user preferences
 */
async function recommendClubs(
  userId: string,
  limit: number,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<RecommendationResult[]> {
  const { data: userProfile } = await supabase
    .from('user_profile')
    .select('location, city')
    .eq('id', userId)
    .single();

  if (!userProfile || !userProfile.location) return [];

  // Find nearby clubs (PostGIS)
  const { data: nearbyClubs } = await supabase.rpc('get_nearby_clubs', {
    p_location: userProfile.location,
    p_radius_km: 20, // 20km radius
  });

  if (!nearbyClubs) return [];

  interface NearbyClub {
    club_id: string;
    club_name: string;
    distance_km: number;
    address: string;
  }

  return (nearbyClubs as NearbyClub[]).slice(0, limit).map((club) => ({
    id: crypto.randomUUID(),
    type: 'club' as const,
    recommended_id: club.club_id,
    score: Math.max(0, 1 - club.distance_km / 20), // Score decreases with distance
    reason: `Club cercano a ${Math.round(club.distance_km * 10) / 10}km`,
    metadata: {
      club_name: club.club_name,
      distance_km: club.distance_km,
      address: club.address,
    },
  }));
}

/**
 * Generate tournament recommendations based on user history and preferences
 */
async function recommendTournaments(
  userId: string,
  limit: number,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<RecommendationResult[]> {
  const { data: userProfile } = await supabase
    .from('user_profile')
    .select('skill_level, city, preferences')
    .eq('id', userId)
    .single();

  if (!userProfile) return [];

  // Find upcoming tournaments matching user's skill level
  const { data: tournaments } = await supabase
    .from('tournament')
    .select('id, name, format, level, location, start_date')
    .eq('status', 'published')
    .gte('start_date', new Date().toISOString())
    .eq('level', userProfile.skill_level)
    .limit(limit);

  if (!tournaments) return [];

  return tournaments.map((tournament) => ({
    id: crypto.randomUUID(),
    type: 'tournament' as const,
    recommended_id: tournament.id,
    score: 0.8, // Base score for matching skill level
    reason: `Torneo para nivel ${tournament.level}`,
    metadata: {
      name: tournament.name,
      format: tournament.format,
      level: tournament.level,
      start_date: tournament.start_date,
    },
  }));
}

/**
 * Generate embeddings for semantic matching (OpenAI)
 * @future - Will be used when implementing semantic search with pgvector
 */
export async function generateUserEmbedding(userId: string): Promise<number[] | null> {
  if (!openai) {
    console.warn('[Recommendations] OpenAI not configured, skipping embeddings');
    return null;
  }

  const supabase = await createServerClient();

  // Get user profile data
  const { data: user } = await supabase
    .from('user_profile')
    .select('display_name, bio, skill_level, city, preferences')
    .eq('id', userId)
    .single();

  if (!user) return null;

  // Create text representation for embedding
  const userText = `
    Name: ${user.display_name}
    Bio: ${user.bio || 'No bio'}
    Skill: ${user.skill_level}
    Location: ${user.city}
    Preferences: ${JSON.stringify(user.preferences || {})}
  `.trim();

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: userText,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[Recommendations] OpenAI embedding failed:', error);
    return null;
  }
}

/**
 * Save recommendations to database
 */
async function saveRecommendations(
  userId: string,
  recommendations: RecommendationResult[],
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<void> {
  const records = recommendations.map((rec) => ({
    user_id: userId,
    recommended_type: rec.type,
    recommended_id: rec.recommended_id,
    score: rec.score,
    reason: rec.reason,
    metadata: rec.metadata,
    shown: false,
    clicked: false,
  }));

  await supabase.from('recommendation').insert(records);
}

/**
 * Main recommendation engine entry point
 */
export async function generateRecommendations(
  input: RecommendationInput
): Promise<RecommendationResult[]> {
  const supabase = await createServerClient();
  let recommendations: RecommendationResult[] = [];

  switch (input.type) {
    case 'players':
      recommendations = await recommendPlayers(input.user_id, input.limit || 10, supabase);
      break;
    case 'clubs':
      recommendations = await recommendClubs(input.user_id, input.limit || 10, supabase);
      break;
    case 'tournaments':
      recommendations = await recommendTournaments(input.user_id, input.limit || 10, supabase);
      break;
  }

  // Save recommendations to database
  if (recommendations.length > 0) {
    await saveRecommendations(input.user_id, recommendations, supabase);
  }

  return recommendations;
}

/**
 * Track recommendation feedback (shown, clicked)
 */
export async function trackRecommendationFeedback(
  recommendationId: string,
  feedback: { shown?: boolean; clicked?: boolean; dismissed?: boolean }
): Promise<void> {
  const supabase = await createServerClient();

  await supabase.from('recommendation').update(feedback).eq('id', recommendationId);
}
