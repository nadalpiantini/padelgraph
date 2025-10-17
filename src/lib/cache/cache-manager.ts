/**
 * Cache Manager - Centralized cache coordination
 *
 * Manages multiple LRU caches for different domains:
 * - Graph connections (social graph paths)
 * - Recommendations (user recommendations)
 * - Embeddings (OpenAI embeddings)
 * - User profiles (frequent user data)
 *
 * Benefits:
 * - Centralized cache invalidation
 * - Domain-specific TTLs
 * - Performance monitoring
 */

import { LRUCache } from './lru-cache';

// Cache configuration
const CACHE_CONFIG = {
  graph: {
    maxSize: 500, // 500 connection paths
    ttl: 5 * 60 * 1000, // 5 minutes
  },
  recommendations: {
    maxSize: 1000, // 1000 user recommendation sets
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  },
  embeddings: {
    maxSize: 2000, // 2000 user embeddings
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days (expensive to regenerate)
  },
  profiles: {
    maxSize: 500, // 500 user profiles
    ttl: 10 * 60 * 1000, // 10 minutes
  },
} as const;

// Type definitions
export interface ConnectionPath {
  connected: boolean;
  degrees_of_separation: number | null;
  path: Array<{
    user_id: string;
    name?: string;
    level?: string;
    city?: string;
    connection_type?: string;
  }>;
}

export interface RecommendationSet {
  user_id: string;
  recommendations: Array<{
    type: 'player' | 'club' | 'tournament';
    entity_id: string;
    score: number;
    reason: string;
  }>;
  generated_at: number;
}

export interface UserEmbedding {
  user_id: string;
  embedding: number[];
  model: string;
  generated_at: number;
}

export interface UserProfile {
  id: string;
  name: string;
  level?: string;
  city?: string;
  location?: { lat: number; lng: number };
}

/**
 * Centralized cache manager
 */
class CacheManager {
  private graphCache: LRUCache<string, ConnectionPath>;
  private recommendationsCache: LRUCache<string, RecommendationSet>;
  private embeddingsCache: LRUCache<string, UserEmbedding>;
  private profilesCache: LRUCache<string, UserProfile>;

  constructor() {
    // Initialize domain-specific caches
    this.graphCache = new LRUCache(
      CACHE_CONFIG.graph.maxSize,
      CACHE_CONFIG.graph.ttl
    );

    this.recommendationsCache = new LRUCache(
      CACHE_CONFIG.recommendations.maxSize,
      CACHE_CONFIG.recommendations.ttl
    );

    this.embeddingsCache = new LRUCache(
      CACHE_CONFIG.embeddings.maxSize,
      CACHE_CONFIG.embeddings.ttl
    );

    this.profilesCache = new LRUCache(
      CACHE_CONFIG.profiles.maxSize,
      CACHE_CONFIG.profiles.ttl
    );

    // Periodic cleanup every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // ============================================================================
  // Graph Connection Cache
  // ============================================================================

  getConnection(fromUserId: string, toUserId: string): ConnectionPath | undefined {
    const key = this.makeConnectionKey(fromUserId, toUserId);
    return this.graphCache.get(key);
  }

  setConnection(fromUserId: string, toUserId: string, path: ConnectionPath): void {
    const key = this.makeConnectionKey(fromUserId, toUserId);
    this.graphCache.set(key, path);

    // Also cache reverse path if connected (symmetric)
    if (path.connected) {
      const reverseKey = this.makeConnectionKey(toUserId, fromUserId);
      const reversePath: ConnectionPath = {
        ...path,
        path: [...path.path].reverse(),
      };
      this.graphCache.set(reverseKey, reversePath);
    }
  }

  invalidateConnectionsForUser(userId: string): void {
    // Remove all connections involving this user
    const keysToDelete = this.graphCache.keys().filter((key) =>
      key.includes(userId)
    );
    keysToDelete.forEach((key) => this.graphCache.delete(key));
  }

  private makeConnectionKey(fromId: string, toId: string): string {
    return `${fromId}:${toId}`;
  }

  // ============================================================================
  // Recommendations Cache
  // ============================================================================

  getRecommendations(userId: string): RecommendationSet | undefined {
    return this.recommendationsCache.get(userId);
  }

  setRecommendations(userId: string, recommendations: RecommendationSet): void {
    this.recommendationsCache.set(userId, recommendations);
  }

  invalidateRecommendations(userId: string): void {
    this.recommendationsCache.delete(userId);
  }

  invalidateAllRecommendations(): void {
    this.recommendationsCache.clear();
  }

  // ============================================================================
  // Embeddings Cache
  // ============================================================================

  getEmbedding(userId: string): UserEmbedding | undefined {
    return this.embeddingsCache.get(userId);
  }

  setEmbedding(userId: string, embedding: UserEmbedding): void {
    this.embeddingsCache.set(userId, embedding);
  }

  invalidateEmbedding(userId: string): void {
    this.embeddingsCache.delete(userId);
  }

  // ============================================================================
  // User Profile Cache
  // ============================================================================

  getProfile(userId: string): UserProfile | undefined {
    return this.profilesCache.get(userId);
  }

  setProfile(userId: string, profile: UserProfile): void {
    this.profilesCache.set(userId, profile);
  }

  invalidateProfile(userId: string): void {
    this.profilesCache.delete(userId);

    // Cascade: invalidate dependent caches
    this.invalidateConnectionsForUser(userId);
    this.invalidateRecommendations(userId);
  }

  // ============================================================================
  // Management & Monitoring
  // ============================================================================

  /**
   * Clear all caches (use cautiously)
   */
  clearAll(): void {
    this.graphCache.clear();
    this.recommendationsCache.clear();
    this.embeddingsCache.clear();
    this.profilesCache.clear();
  }

  /**
   * Cleanup expired entries across all caches
   */
  cleanup(): { cleaned: number; total: number } {
    const cleaned =
      this.graphCache.cleanup() +
      this.recommendationsCache.cleanup() +
      this.embeddingsCache.cleanup() +
      this.profilesCache.cleanup();

    const total =
      this.graphCache.size() +
      this.recommendationsCache.size() +
      this.embeddingsCache.size() +
      this.profilesCache.size();

    return { cleaned, total };
  }

  /**
   * Get statistics for all caches
   */
  stats() {
    return {
      graph: this.graphCache.stats(),
      recommendations: this.recommendationsCache.stats(),
      embeddings: this.embeddingsCache.stats(),
      profiles: this.profilesCache.stats(),
    };
  }

  /**
   * Health check
   */
  health(): {
    healthy: boolean;
    warnings: string[];
  } {
    const stats = this.stats();
    const warnings: string[] = [];

    // Check if any cache is >90% full
    Object.entries(stats).forEach(([name, stat]) => {
      if (stat.utilizationPercent > 90) {
        warnings.push(`${name} cache is ${stat.utilizationPercent.toFixed(1)}% full`);
      }
    });

    return {
      healthy: warnings.length === 0,
      warnings,
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
