/**
 * Validation schemas for travel plans endpoints
 */
import { z } from 'zod';

// Travel Plan CRUD validations
export const createTravelPlanSchema = z.object({
  destination_city: z.string().min(1, 'Destination city is required').max(100, 'City name too long'),
  destination_country: z.string().max(100, 'Country name too long').optional().nullable(),
  location: z.object({
    lat: z.number().min(-90).max(90, 'Invalid latitude'),
    lng: z.number().min(-180).max(180, 'Invalid longitude'),
  }).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  preferences: z.object({
    level: z.enum(['beginner', 'intermediate', 'advanced', 'professional']).optional(),
    format: z.enum(['singles', 'doubles', 'mixed', 'any']).optional(),
    play_style: z.string().max(100).optional(),
    looking_for: z.array(z.enum(['players', 'clubs', 'tournaments', 'training'])).optional(),
  }).optional().nullable(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
);

export const updateTravelPlanSchema = createTravelPlanSchema.partial().extend({
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
});

export const travelPlansQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const suggestionsQuerySchema = z.object({
  radius_km: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['clubs', 'tournaments', 'players', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// Export types
export type CreateTravelPlanInput = z.infer<typeof createTravelPlanSchema>;
export type UpdateTravelPlanInput = z.infer<typeof updateTravelPlanSchema>;
export type TravelPlansQueryInput = z.infer<typeof travelPlansQuerySchema>;
export type SuggestionsQueryInput = z.infer<typeof suggestionsQuerySchema>;
