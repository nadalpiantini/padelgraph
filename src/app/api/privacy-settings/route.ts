/**
 * Privacy Settings API endpoint
 * GET /api/privacy-settings - Get current user's privacy settings
 * PUT /api/privacy-settings - Update privacy settings
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { updatePrivacySettingsSchema } from '@/lib/validations/privacy';

export async function GET() {
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

    // Fetch privacy settings (RLS ensures user can only see their own)
    const { data: settings, error: settingsError } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no settings exist yet, return defaults
    if (settingsError && settingsError.code === 'PGRST116') {
      return successResponse({
        user_id: user.id,
        location_visibility: 'clubs_only',
        profile_visibility: 'public',
        auto_match_enabled: true,
        show_in_discovery: true,
        graph_visibility: 'friends',
        updated_at: new Date().toISOString(),
      });
    }

    if (settingsError) {
      console.error('[Privacy Settings API] Error fetching settings:', settingsError);
      return serverErrorResponse('Failed to fetch privacy settings', settingsError);
    }

    return successResponse(settings);
  } catch (error) {
    console.error('[Privacy Settings API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

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
    const validation = updatePrivacySettingsSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    // Upsert privacy settings (create if doesn't exist, update if exists)
    const { data: updatedSettings, error: updateError } = await supabase
      .from('privacy_settings')
      .upsert(
        {
          user_id: user.id,
          ...validation.data,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (updateError) {
      console.error('[Privacy Settings API] Error updating settings:', updateError);
      return serverErrorResponse('Failed to update privacy settings', updateError);
    }

    return successResponse(updatedSettings, 'Privacy settings updated successfully');
  } catch (error) {
    console.error('[Privacy Settings API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
