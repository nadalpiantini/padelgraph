/**
 * Availability API endpoint
 * POST /api/availability - Create availability slot (admin only)
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { createAvailabilitySchema } from '@/lib/validations/admin';
import { checkCourtAccess } from '@/lib/permissions';

export async function POST(request: Request) {
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
    const validation = createAvailabilitySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid availability data', validation.error.issues);
    }

    const availabilityData = validation.data;

    // Check if user has access to this court
    const { hasAccess, error: permError } = await checkCourtAccess(user.id, availabilityData.court_id);

    if (!hasAccess) {
      return errorResponse(permError || 'Insufficient permissions', [], 403);
    }

    // Normalize times to HH:MM:SS format
    const normalizeTime = (time: string) => {
      return time.length === 5 ? `${time}:00` : time;
    };

    // Create the availability slot
    const { data: newAvailability, error: createError } = await supabase
      .from('availability')
      .insert({
        court_id: availabilityData.court_id,
        day_of_week: availabilityData.day_of_week,
        start_time: normalizeTime(availabilityData.start_time),
        end_time: normalizeTime(availabilityData.end_time),
        price_per_hour: availabilityData.price_per_hour,
        active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Availability API] Error creating availability:', createError);
      return serverErrorResponse('Failed to create availability', createError);
    }

    return successResponse({
      availability: newAvailability,
      message: 'Availability slot created successfully',
    });
  } catch (error) {
    console.error('[Availability API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
