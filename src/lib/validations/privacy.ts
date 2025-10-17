/**
 * Validation schemas for privacy settings endpoints
 */
import { z } from 'zod';

// Privacy Settings validations
export const privacySettingsSchema = z.object({
  location_visibility: z.enum(['public', 'friends', 'clubs_only', 'private']).default('clubs_only'),
  profile_visibility: z.enum(['public', 'friends', 'clubs_only', 'private']).default('public'),
  auto_match_enabled: z.boolean().default(true),
  show_in_discovery: z.boolean().default(true),
  graph_visibility: z.enum(['public', 'friends', 'clubs_only', 'private']).default('friends'),
});

// Partial update schema (all fields optional)
export const updatePrivacySettingsSchema = privacySettingsSchema.partial();

// Export types
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>;
