/**
 * AI Integration - Type Definitions
 *
 * Types for OpenAI embeddings and semantic similarity
 */

// ============================================================================
// OpenAI Configuration
// ============================================================================

export interface OpenAIConfig {
  apiKey: string;
  model: string; // 'text-embedding-3-small' | 'text-embedding-3-large'
  maxRetries: number;
  timeout: number; // milliseconds
}

export const DEFAULT_OPENAI_CONFIG: Partial<OpenAIConfig> = {
  model: 'text-embedding-3-small', // Cost-effective: $0.02 / 1M tokens
  maxRetries: 3,
  timeout: 10000,
};

// ============================================================================
// Embeddings
// ============================================================================

export interface EmbeddingRequest {
  text: string;
  user_id?: string; // For caching
  metadata?: Record<string, unknown>;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
  cached: boolean;
}

export interface UserProfileEmbedding {
  user_id: string;
  embedding: number[];
  model: string;
  profile_version: string; // Hash of profile data for cache invalidation
  generated_at: Date;
}

// ============================================================================
// Semantic Similarity
// ============================================================================

export interface SimilarityScore {
  user_a_id: string;
  user_b_id: string;
  similarity: number; // 0-1 (cosine similarity)
  method: 'embedding' | 'hybrid';
}

export interface SemanticSearchRequest {
  query_user_id: string;
  candidate_user_ids: string[];
  top_k?: number;
  threshold?: number; // Min similarity (0-1)
}

export interface SemanticSearchResult {
  user_id: string;
  similarity: number;
  rank: number;
}

// ============================================================================
// Profile Text Generation
// ============================================================================

export interface UserProfileText {
  user_id: string;
  text: string;
  version: string; // Hash for cache invalidation
  generated_at: Date;
}

/**
 * Generate text representation of user profile for embedding
 */
export interface ProfileData {
  name?: string;
  level?: string;
  city?: string;
  bio?: string;
  play_style?: {
    aggressive: number;
    defensive: number;
    consistent: number;
    strategic: number;
  };
  preferred_format?: string;
  availability?: string[];
  interests?: string[];
  achievements?: string[];
}
