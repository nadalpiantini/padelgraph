/**
 * Tournament Validation Schemas
 *
 * Zod validation schemas for tournament-related API requests.
 */

import { z } from 'zod';

/**
 * Tournament creation schema
 */
export const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['americano', 'mexicano']),
  starts_at: z.string().datetime(),
  max_participants: z.number().int().min(4).max(100),
  location_lat: z.number().min(-90).max(90),
  location_lng: z.number().min(-180).max(180),
  geofence_radius_meters: z.number().int().min(10).max(1000).default(100),
  match_duration_minutes: z.number().int().min(30).max(180).default(90),
  points_per_win: z.number().int().min(1).max(10).default(3),
  points_per_draw: z.number().int().min(0).max(5).default(1),
  points_per_loss: z.number().int().min(0).max(5).default(0),
  settings: z
    .object({
      auto_advance_rounds: z.boolean().optional(),
      notify_participants: z.boolean().optional(),
      allow_late_checkin: z.boolean().optional(),
    })
    .optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

/**
 * Tournament update schema
 */
export const updateTournamentSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  starts_at: z.string().datetime().optional(),
  max_participants: z.number().int().min(4).max(100).optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  geofence_radius_meters: z.number().int().min(10).max(1000).optional(),
  match_duration_minutes: z.number().int().min(30).max(180).optional(),
  settings: z
    .object({
      auto_advance_rounds: z.boolean().optional(),
      notify_participants: z.boolean().optional(),
      allow_late_checkin: z.boolean().optional(),
    })
    .optional(),
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

/**
 * Tournament query filters schema
 */
export const tournamentQuerySchema = z.object({
  org_id: z.string().uuid().optional(),
  status: z
    .enum(['draft', 'published', 'in_progress', 'completed', 'cancelled'])
    .optional(),
  type: z.enum(['americano', 'mexicano']).optional(),
  starts_after: z.string().datetime().optional(),
  starts_before: z.string().datetime().optional(),
  nearby: z
    .string()
    .regex(/^-?\d+\.?\d*,-?\d+\.?\d*,\d+\.?\d*$/)
    .optional(), // lat,lng,radius_km
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TournamentQueryInput = z.infer<typeof tournamentQuerySchema>;

/**
 * Check-in schema with GPS coordinates
 */
export const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

/**
 * Match score submission schema
 */
export const submitScoreSchema = z.object({
  team1_score: z.number().int().min(0).max(99),
  team2_score: z.number().int().min(0).max(99),
});

export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;

/**
 * Tournament start validation
 */
export const startTournamentSchema = z.object({
  court_ids: z.array(z.string().uuid()).min(1).optional(),
  court_strategy: z.enum(['balanced', 'sequential', 'random']).default('balanced'),
});

export type StartTournamentInput = z.infer<typeof startTournamentSchema>;
