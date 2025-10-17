/**
 * Validation schemas for admin endpoints
 */
import { z } from 'zod';

// Re-export court/availability schemas from booking
export {
  createCourtSchema,
  updateCourtSchema,
  createAvailabilitySchema,
  type CreateCourtInput,
  type UpdateCourtInput,
  type CreateAvailabilityInput,
} from './booking';

// Admin-specific validations
export const updateAvailabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).optional(),
  price_per_hour: z.number().min(0).optional(),
  active: z.boolean().optional(),
}).refine(
  (data) => {
    // If both times are provided, end must be after start
    if (data.start_time && data.end_time) {
      return data.end_time > data.start_time;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

// Dashboard query schema
export const dashboardQuerySchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
});

// Admin role validation
export const orgRoleEnum = z.enum(['owner', 'admin', 'member']);

// Org member check schema (for middleware/helpers)
export const orgMembershipSchema = z.object({
  user_id: z.string().uuid(),
  org_id: z.string().uuid(),
  role: orgRoleEnum.optional(),
});

// Export types
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
export type OrgRole = z.infer<typeof orgRoleEnum>;
export type OrgMembershipInput = z.infer<typeof orgMembershipSchema>;
