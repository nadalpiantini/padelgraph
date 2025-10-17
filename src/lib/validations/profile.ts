/**
 * Validation schemas for profile endpoints
 */
import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().nullable(),
  level: z.number().min(1.0).max(7.0).optional(),
  city: z.string().min(1).max(100).optional().nullable(),
  country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

export const preferencesUpdateSchema = z.object({
  lang: z.enum(['en', 'es']).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      show_location: z.boolean().optional(),
      show_level: z.boolean().optional(),
      discoverable: z.boolean().optional(),
    })
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;
