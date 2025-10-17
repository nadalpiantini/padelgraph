/**
 * OpenAI Embeddings Integration
 *
 * Semantic similarity matching using OpenAI text-embedding-3-small
 *
 * Features:
 * - Generate embeddings for user profiles
 * - Calculate cosine similarity
 * - Semantic search for similar users
 * - Cost-optimized caching (7-day TTL)
 *
 * Cost Estimate:
 * - text-embedding-3-small: $0.02 / 1M tokens
 * - Average profile: ~200 tokens
 * - 1000 users = 200k tokens = $0.004
 * - With 7-day cache: <$0.01 per user per month
 */

import type {
  OpenAIConfig,
  EmbeddingRequest,
  EmbeddingResponse,
  UserProfileEmbedding,
  SimilarityScore,
  SemanticSearchRequest,
  SemanticSearchResult,
  ProfileData,
} from './types';
import { DEFAULT_OPENAI_CONFIG } from './types';
import { cacheManager } from '../cache/cache-manager';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Profile Text Generation
// ============================================================================

/**
 * Generate text representation of user profile
 * This is what gets embedded
 */
function generateProfileText(profile: ProfileData): string {
  const parts: string[] = [];

  // Basic info
  if (profile.name) parts.push(`Player: ${profile.name}`);
  if (profile.level) parts.push(`Skill level: ${profile.level}`);
  if (profile.city) parts.push(`Location: ${profile.city}`);

  // Bio/description
  if (profile.bio) parts.push(`Bio: ${profile.bio}`);

  // Play style
  if (profile.play_style) {
    const styleDescriptions: string[] = [];
    if (profile.play_style.aggressive > 0.7) styleDescriptions.push('aggressive');
    if (profile.play_style.defensive > 0.7) styleDescriptions.push('defensive');
    if (profile.play_style.consistent > 0.7) styleDescriptions.push('consistent');
    if (profile.play_style.strategic > 0.7) styleDescriptions.push('strategic');

    if (styleDescriptions.length > 0) {
      parts.push(`Play style: ${styleDescriptions.join(', ')}`);
    }
  }

  // Preferences
  if (profile.preferred_format) {
    parts.push(`Prefers: ${profile.preferred_format}`);
  }

  // Availability
  if (profile.availability && profile.availability.length > 0) {
    parts.push(`Available: ${profile.availability.join(', ')}`);
  }

  // Interests
  if (profile.interests && profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(', ')}`);
  }

  // Achievements
  if (profile.achievements && profile.achievements.length > 0) {
    parts.push(`Achievements: ${profile.achievements.join(', ')}`);
  }

  return parts.join('. ') + '.';
}

/**
 * Generate version hash for cache invalidation
 */
function generateProfileVersion(profile: ProfileData): string {
  const text = JSON.stringify(profile);
  // Simple hash (for production, use crypto.subtle)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Fetch user profile data from database
 */
async function fetchUserProfileData(userId: string): Promise<ProfileData | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('user_profile')
    .select('name, level, city, bio, play_style, preferred_format, availability, interests')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  // Get achievements (tournament wins, etc.)
  const { data: achievements } = await supabase
    .from('tournament_participant')
    .select('tournament_id')
    .eq('user_id', userId)
    .eq('final_rank', 1)
    .limit(5);

  return {
    name: profile.name,
    level: profile.level,
    city: profile.city,
    bio: profile.bio,
    play_style: profile.play_style,
    preferred_format: profile.preferred_format,
    availability: profile.availability,
    interests: profile.interests,
    achievements: achievements?.map(() => 'Tournament Winner') || [],
  };
}

// ============================================================================
// OpenAI API Integration
// ============================================================================

/**
 * Call OpenAI Embeddings API
 */
async function callOpenAIEmbeddings(
  text: string,
  config: OpenAIConfig
): Promise<{ embedding: number[]; usage: { prompt_tokens: number; total_tokens: number } }> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
      encoding_format: 'float',
    }),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    embedding: data.data[0].embedding,
    usage: data.usage,
  };
}

// ============================================================================
// Similarity Calculation
// ============================================================================

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embeddingA: number[], embeddingB: number[]): number {
  if (embeddingA.length !== embeddingB.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
    normA += embeddingA[i] * embeddingA[i];
    normB += embeddingB[i] * embeddingB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// Main Embeddings Service
// ============================================================================

class EmbeddingsService {
  private config: OpenAIConfig;

  constructor(config?: Partial<OpenAIConfig>) {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      ...DEFAULT_OPENAI_CONFIG,
      ...config,
    } as OpenAIConfig;

    if (!this.config.apiKey) {
      console.warn('[Embeddings] OpenAI API key not configured');
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // Check cache first
    if (request.user_id) {
      const cached = cacheManager.getEmbedding(request.user_id);
      if (cached) {
        return {
          embedding: cached.embedding,
          model: cached.model,
          usage: { prompt_tokens: 0, total_tokens: 0 },
          cached: true,
        };
      }
    }

    // Call OpenAI API
    const { embedding, usage } = await callOpenAIEmbeddings(request.text, this.config);

    // Cache if user_id provided
    if (request.user_id) {
      cacheManager.setEmbedding(request.user_id, {
        user_id: request.user_id,
        embedding,
        model: this.config.model,
        generated_at: Date.now(),
      });
    }

    return {
      embedding,
      model: this.config.model,
      usage,
      cached: false,
    };
  }

  /**
   * Generate embedding for user profile
   */
  async generateUserEmbedding(userId: string): Promise<UserProfileEmbedding> {
    // Check cache
    const cached = cacheManager.getEmbedding(userId);
    if (cached) {
      return {
        user_id: cached.user_id,
        embedding: cached.embedding,
        model: cached.model,
        profile_version: 'cached',
        generated_at: new Date(),
      };
    }

    // Fetch profile data
    const profileData = await fetchUserProfileData(userId);
    if (!profileData) {
      throw new Error(`User profile not found: ${userId}`);
    }

    // Generate text representation
    const profileText = generateProfileText(profileData);
    const version = generateProfileVersion(profileData);

    // Generate embedding
    const { embedding, model } = await this.generateEmbedding({
      text: profileText,
      user_id: userId,
    });

    return {
      user_id: userId,
      embedding,
      model,
      profile_version: version,
      generated_at: new Date(),
    };
  }

  /**
   * Calculate similarity between two users
   */
  async calculateUserSimilarity(userAId: string, userBId: string): Promise<SimilarityScore> {
    const [embeddingA, embeddingB] = await Promise.all([
      this.generateUserEmbedding(userAId),
      this.generateUserEmbedding(userBId),
    ]);

    const similarity = cosineSimilarity(embeddingA.embedding, embeddingB.embedding);

    return {
      user_a_id: userAId,
      user_b_id: userBId,
      similarity,
      method: 'embedding',
    };
  }

  /**
   * Semantic search: find most similar users
   */
  async semanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResult[]> {
    // Get query user embedding
    const queryEmbedding = await this.generateUserEmbedding(request.query_user_id);

    // Get candidate embeddings in parallel (batched)
    const candidateEmbeddings = await Promise.all(
      request.candidate_user_ids.map((id) => this.generateUserEmbedding(id))
    );

    // Calculate similarities
    const similarities = candidateEmbeddings
      .map((candidate) => ({
        user_id: candidate.user_id,
        similarity: cosineSimilarity(queryEmbedding.embedding, candidate.embedding),
      }))
      .filter((s) => s.similarity >= (request.threshold || 0))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, request.top_k || 10)
      .map((s, index) => ({
        ...s,
        rank: index + 1,
      }));

    return similarities;
  }

  /**
   * Batch generate embeddings for multiple users
   * Optimized for cost: processes only users without cached embeddings
   */
  async batchGenerateUserEmbeddings(userIds: string[]): Promise<UserProfileEmbedding[]> {
    const results: UserProfileEmbedding[] = [];

    // Check cache first
    const uncachedUserIds: string[] = [];
    for (const userId of userIds) {
      const cached = cacheManager.getEmbedding(userId);
      if (cached) {
        results.push({
          user_id: cached.user_id,
          embedding: cached.embedding,
          model: cached.model,
          profile_version: 'cached',
          generated_at: new Date(),
        });
      } else {
        uncachedUserIds.push(userId);
      }
    }

    // Generate embeddings for uncached users
    // Process in batches to avoid rate limits
    const batchSize = 20;
    for (let i = 0; i < uncachedUserIds.length; i += batchSize) {
      const batch = uncachedUserIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((userId) => this.generateUserEmbedding(userId))
      );
      results.push(...batchResults);

      // Rate limiting: wait 1s between batches
      if (i + batchSize < uncachedUserIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Invalidate user embedding cache
   */
  invalidateUserEmbedding(userId: string): void {
    cacheManager.invalidateEmbedding(userId);
  }

  /**
   * Check if OpenAI API is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }
}

// Export singleton instance
export const embeddingsService = new EmbeddingsService();
