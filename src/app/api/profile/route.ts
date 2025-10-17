/**
 * Profile API endpoint
 * GET /api/profile - Get current user profile
 * PUT /api/profile - Update current user profile
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { profileUpdateSchema } from '@/lib/validations/profile';

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

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Profile API] Error fetching profile:', profileError);
      return serverErrorResponse('Failed to fetch profile', profileError);
    }

    if (!profile) {
      return notFoundResponse('Profile');
    }

    return successResponse(profile);
  } catch (error) {
    console.error('[Profile API] Unexpected error:', error);
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
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profile')
      .update(validation.data)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Profile API] Error updating profile:', updateError);
      return serverErrorResponse('Failed to update profile', updateError);
    }

    return successResponse(updatedProfile, 'Profile updated successfully');
  } catch (error) {
    console.error('[Profile API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
