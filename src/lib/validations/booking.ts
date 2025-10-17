/**
 * Validation schemas for booking endpoints
 */
import { z } from 'zod';

// Court validations
export const createCourtSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Court name is required').max(100, 'Name too long'),
  type: z.enum(['indoor', 'outdoor', 'covered']).default('outdoor'),
  surface: z.enum(['carpet', 'concrete', 'grass', 'crystal', 'synthetic']).default('concrete'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
});

export const updateCourtSchema = createCourtSchema.partial().omit({ org_id: true });

export const courtsQuerySchema = z.object({
  org_id: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Availability validations
export const createAvailabilitySchema = z.object({
  court_id: z.string().uuid('Invalid court ID'),
  day_of_week: z.number().int().min(0).max(6, 'Day must be 0-6 (Sun-Sat)'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format (HH:MM:SS)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format (HH:MM:SS)'),
  price_per_hour: z.number().min(0, 'Price must be positive'),
});

export const availabilityQuerySchema = z.object({
  court_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Booking validations
export const createBookingSchema = z.object({
  court_id: z.string().uuid('Invalid court ID'),
  start_at: z.string().datetime('Invalid datetime format'),
  end_at: z.string().datetime('Invalid datetime format'),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
}).refine(
  (data) => new Date(data.end_at) > new Date(data.start_at),
  {
    message: 'End time must be after start time',
    path: ['end_at'],
  }
);

export const bookingsQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  court_id: z.string().uuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
});

// Export types
export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;
export type CourtsQueryInput = z.infer<typeof courtsQuerySchema>;
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingsQueryInput = z.infer<typeof bookingsQuerySchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
