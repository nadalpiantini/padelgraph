/**
 * Validation schemas for discovery/nearby endpoints
 */
import { z } from 'zod';

// Nearby search validation
export const nearbyQuerySchema = z.object({
  type: z.enum(['players', 'clubs', 'matches', 'all']).default('all'),
  radius_km: z.coerce.number().min(1).max(100).default(10),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'professional']).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  availability: z.enum(['now', 'today', 'week', 'any']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Discovery feed validation
export const feedQuerySchema = z.object({
  location: z.enum(['auto', 'custom']).default('auto'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().min(1).max(100).default(20),
  event_type: z.enum(['new_player', 'upcoming_match', 'new_tournament', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine(
  (data) => {
    if (data.location === 'custom') {
      return data.lat !== undefined && data.lng !== undefined;
    }
    return true;
  },
  {
    message: 'Custom location requires lat and lng',
    path: ['location'],
  }
);

// Bookmark validation
export const bookmarkSchema = z.object({
  entity_type: z.enum(['player', 'club', 'match', 'tournament']),
  entity_id: z.string().uuid('Invalid entity ID'),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
});

// Export types
export type NearbyQueryInput = z.infer<typeof nearbyQuerySchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type BookmarkInput = z.infer<typeof bookmarkSchema>;
