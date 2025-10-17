import { log } from "@/lib/logger";
/**
 * Preferences API endpoint
 * PUT /api/preferences - Update user preferences
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { preferencesUpdateSchema } from '@/lib/validations/profile';
import type { UserPreferences } from '@/types/database';

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = preferencesUpdateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    // Get current profile to merge preferences
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profile')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      log.error('[Preferences API] Error fetching profile', { error: fetchError });
      return serverErrorResponse('Failed to fetch current preferences', fetchError);
    }

    // Merge new preferences with existing ones
    const currentPreferences = (currentProfile.preferences as UserPreferences) || {
      lang: 'en',
      notifications: {
        email: true,
        whatsapp: true,
        sms: false,
        push: true,
      },
      privacy: {
        show_location: true,
        show_level: true,
        discoverable: true,
      },
    };

    const updatedPreferences: UserPreferences = {
      lang: validation.data.lang || currentPreferences.lang,
      notifications: {
        ...currentPreferences.notifications,
        ...validation.data.notifications,
      },
      privacy: {
        ...currentPreferences.privacy,
        ...validation.data.privacy,
      },
    };

    // Update profile with merged preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profile')
      .update({ preferences: updatedPreferences })
      .eq('id', user.id)
      .select('preferences')
      .single();

    if (updateError) {
      log.error('[Preferences API] Error updating preferences', { error: updateError });
      return serverErrorResponse('Failed to update preferences', updateError);
    }

    return successResponse(updatedProfile.preferences, 'Preferences updated successfully');
  } catch (error) {
    log.error('[Preferences API] Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
