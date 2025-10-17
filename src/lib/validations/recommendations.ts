import { z } from 'zod';

/**
 * Validation schemas for Recommendations API
 */

// GET /api/recommendations query params
export const recommendationsQuerySchema = z.object({
  type: z.enum(['players', 'clubs', 'tournaments']).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1).max(50)),
  include_shown: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

// POST /api/recommendations/feedback body
export const recommendationFeedbackSchema = z.object({
  recommendation_id: z.string().uuid(),
  shown: z.boolean().optional(),
  clicked: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});

// POST /api/recommendations/generate body (admin/system use)
export const generateRecommendationsSchema = z.object({
  user_id: z.string().uuid().optional(), // Optional, defaults to current user
  type: z.enum(['players', 'clubs', 'tournaments']),
  limit: z.number().min(1).max(50).optional().default(10),
  force_refresh: z.boolean().optional().default(false),
});

export type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;
export type RecommendationFeedback = z.infer<typeof recommendationFeedbackSchema>;
export type GenerateRecommendations = z.infer<typeof generateRecommendationsSchema>;
