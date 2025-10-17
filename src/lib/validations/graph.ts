/**
 * Validation schemas for social graph endpoints
 */
import { z } from 'zod';

// Connection path query validation
export const connectionQuerySchema = z.object({
  target_user_id: z.string().uuid('Invalid target user ID'),
  max_depth: z.coerce.number().int().min(1).max(6).default(6),
});

// Network query validation
export const networkQuerySchema = z.object({
  degree: z.coerce.number().int().min(1).max(2).default(1), // 1st or 2nd degree connections
  connection_type: z.enum(['played_with', 'friend', 'clubmate', 'tournament', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Graph stats query validation (no parameters needed, but keeping for consistency)
export const statsQuerySchema = z.object({
  include_breakdown: z.coerce.boolean().default(false),
});

// Export types
export type ConnectionQueryInput = z.infer<typeof connectionQuerySchema>;
export type NetworkQueryInput = z.infer<typeof networkQuerySchema>;
export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
