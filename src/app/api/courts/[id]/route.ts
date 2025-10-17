/**
 * Individual Court API endpoint
 * GET /api/courts/[id] - Get court details with availability schedule
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const courtIdSchema = z.object({
  id: z.string().uuid('Invalid court ID'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate court ID
    const validation = courtIdSchema.safeParse({ id });

    if (!validation.success) {
      return errorResponse('Invalid court ID', validation.error.issues);
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Fetch court with organization and availability schedule
    const { data: court, error: courtError } = await supabase
      .from('court')
      .select(
        `
        *,
        organization:organization (
          id,
          name,
          slug,
          type
        ),
        availability:availability (
          id,
          day_of_week,
          start_time,
          end_time,
          price_per_hour,
          active
        )
      `
      )
      .eq('id', id)
      .single();

    if (courtError) {
      if (courtError.code === 'PGRST116') {
        return notFoundResponse('Court');
      }
      console.error('[Court API] Error fetching court:', courtError);
      return serverErrorResponse('Failed to fetch court', courtError);
    }

    if (!court) {
      return notFoundResponse('Court');
    }

    return successResponse(court);
  } catch (error) {
    console.error('[Court API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
