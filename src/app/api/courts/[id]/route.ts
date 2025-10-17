/**
 * Individual Court API endpoint
 * GET /api/courts/[id] - Get court details
 * PUT /api/courts/[id] - Update court (admin only)
 * DELETE /api/courts/[id] - Deactivate court (admin only, soft delete)
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
import { updateCourtSchema } from '@/lib/validations/admin';
import { checkCourtAccess } from '@/lib/permissions';

const courtIdSchema = z.object({
  id: z.string().uuid('Invalid court ID'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/courts/[id] - Get court details with availability
 */
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

    // Fetch court with organization and availability
    const { data: court, error: courtError } = await supabase
      .from('court')
      .select(
        `
        *,
        organization:organization (
          id,
          name,
          slug
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

    if (courtError || !court) {
      return notFoundResponse('Court');
    }

    return successResponse({ court });
  } catch (error) {
    console.error('[Court API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

/**
 * PUT /api/courts/[id] - Update court details
 */
export async function PUT(request: Request, { params }: RouteParams) {
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

    // Check if user has admin access to this court
    const { hasAccess, error: permError } = await checkCourtAccess(user.id, id);

    if (!hasAccess) {
      return errorResponse(permError || 'Insufficient permissions', [], 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const updateValidation = updateCourtSchema.safeParse(body);

    if (!updateValidation.success) {
      return errorResponse('Invalid court update data', updateValidation.error.issues);
    }

    const updateData = updateValidation.data;

    // Update the court
    const { data: updatedCourt, error: updateError } = await supabase
      .from('court')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Court API] Error updating court:', updateError);
      return serverErrorResponse('Failed to update court', updateError);
    }

    if (!updatedCourt) {
      return notFoundResponse('Court');
    }

    return successResponse({
      court: updatedCourt,
      message: 'Court updated successfully',
    });
  } catch (error) {
    console.error('[Court API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

/**
 * DELETE /api/courts/[id] - Deactivate court (soft delete)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
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

    // Check if user has admin access to this court
    const { hasAccess, error: permError } = await checkCourtAccess(user.id, id);

    if (!hasAccess) {
      return errorResponse(permError || 'Insufficient permissions', [], 403);
    }

    // Soft delete: set active to false
    const { data: deactivatedCourt, error: deleteError } = await supabase
      .from('court')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single();

    if (deleteError) {
      console.error('[Court API] Error deactivating court:', deleteError);
      return serverErrorResponse('Failed to deactivate court', deleteError);
    }

    if (!deactivatedCourt) {
      return notFoundResponse('Court');
    }

    return successResponse({
      court: deactivatedCourt,
      message: 'Court deactivated successfully',
    });
  } catch (error) {
    console.error('[Court API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
