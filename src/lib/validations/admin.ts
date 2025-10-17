/**
 * Validation schemas for admin operations
 * Sprint 1 - Phase 6: Admin Panel
 */

import { z } from 'zod';

// ============================================================================
// COURT MANAGEMENT SCHEMAS
// ============================================================================

export const createCourtSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Court name is required').max(100, 'Court name too long'),
  type: z.enum(['indoor', 'outdoor', 'covered'], {
    message: 'Type must be indoor, outdoor, or covered',
  }),
  surface: z.enum(['carpet', 'concrete', 'grass', 'crystal', 'synthetic'], {
    message: 'Invalid surface type',
  }),
  description: z.string().max(500, 'Description too long').optional(),
});

export const updateCourtSchema = z.object({
  name: z.string().min(1, 'Court name is required').max(100, 'Court name too long').optional(),
  type: z
    .enum(['indoor', 'outdoor', 'covered'], {
      message: 'Type must be indoor, outdoor, or covered',
    })
    .optional(),
  surface: z
    .enum(['carpet', 'concrete', 'grass', 'crystal', 'synthetic'], {
      message: 'Invalid surface type',
    })
    .optional(),
  description: z.string().max(500, 'Description too long').optional(),
  active: z.boolean().optional(),
});

// ============================================================================
// AVAILABILITY MANAGEMENT SCHEMAS
// ============================================================================

export const createAvailabilitySchema = z
  .object({
    court_id: z.string().uuid('Invalid court ID'),
    day_of_week: z
      .number()
      .int('Day of week must be an integer')
      .min(0, 'Day of week must be 0-6 (Sunday-Saturday)')
      .max(6, 'Day of week must be 0-6 (Sunday-Saturday)'),
    start_time: z
      .string()
      .regex(/^([0-1]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Invalid time format (HH:MM or HH:MM:SS)'),
    end_time: z
      .string()
      .regex(/^([0-1]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Invalid time format (HH:MM or HH:MM:SS)'),
    price_per_hour: z.number().positive('Price must be positive'),
  })
  .refine(
    (data) => {
      // Normalize times to HH:MM:SS format
      const normalizeTime = (time: string) => {
        return time.length === 5 ? `${time}:00` : time;
      };

      const start = normalizeTime(data.start_time);
      const end = normalizeTime(data.end_time);

      return start < end;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  );

export const updateAvailabilitySchema = z
  .object({
    day_of_week: z
      .number()
      .int('Day of week must be an integer')
      .min(0, 'Day of week must be 0-6 (Sunday-Saturday)')
      .max(6, 'Day of week must be 0-6 (Sunday-Saturday)')
      .optional(),
    start_time: z
      .string()
      .regex(/^([0-1]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Invalid time format (HH:MM or HH:MM:SS)')
      .optional(),
    end_time: z
      .string()
      .regex(/^([0-1]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Invalid time format (HH:MM or HH:MM:SS)')
      .optional(),
    price_per_hour: z.number().positive('Price must be positive').optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Only validate time range if both are provided
      if (!data.start_time || !data.end_time) return true;

      const normalizeTime = (time: string) => {
        return time.length === 5 ? `${time}:00` : time;
      };

      const start = normalizeTime(data.start_time);
      const end = normalizeTime(data.end_time);

      return start < end;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  );

// ============================================================================
// TYPES (inferred from schemas)
// ============================================================================

export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
