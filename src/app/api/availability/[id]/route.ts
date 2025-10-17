/**
 * Individual Availability API endpoint
 * PUT /api/availability/[id] - Update availability slot (admin only)
 * DELETE /api/availability/[id] - Delete availability slot (admin only)
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
import { updateAvailabilitySchema } from '@/lib/validations/admin';

const availabilityIdSchema = z.object({
  id: z.string().uuid('Invalid availability ID'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/availability/[id] - Update availability slot
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate availability ID
    const validation = availabilityIdSchema.safeParse({ id });

    if (!validation.success) {
      return errorResponse('Invalid availability ID', validation.error.issues);
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Get availability to check court ownership
    const { data: availability, error: fetchError } = await supabase
      .from('availability')
      .select(
        `
        *,
        court:court (
          org_id
        )
      `
      )
      .eq('id', id)
      .single();

    if (fetchError || !availability) {
      return notFoundResponse('Availability slot');
    }

    // Check if user is admin/owner of the court's organization
    const court = availability.court as { org_id: string } | null;
    if (!court) {
      return errorResponse('Court not found for this availability slot', [], 404);
    }

    const { data: membership, error: membershipError } = await supabase
      .from('org_member')
      .select('role')
      .eq('org_id', court.org_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['admin', 'owner'].includes(membership.role)) {
      return errorResponse('Insufficient permissions', [], 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const updateValidation = updateAvailabilitySchema.safeParse(body);

    if (!updateValidation.success) {
      return errorResponse('Invalid availability update data', updateValidation.error.issues);
    }

    const updateData = updateValidation.data;

    // Normalize times if provided
    if (updateData.start_time || updateData.end_time) {
      const normalizeTime = (time: string) => {
        return time.length === 5 ? `${time}:00` : time;
      };

      if (updateData.start_time) {
        updateData.start_time = normalizeTime(updateData.start_time);
      }
      if (updateData.end_time) {
        updateData.end_time = normalizeTime(updateData.end_time);
      }
    }

    // Update the availability slot
    const { data: updatedAvailability, error: updateError } = await supabase
      .from('availability')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Availability API] Error updating availability:', updateError);
      return serverErrorResponse('Failed to update availability', updateError);
    }

    if (!updatedAvailability) {
      return notFoundResponse('Availability slot');
    }

    return successResponse({
      availability: updatedAvailability,
      message: 'Availability slot updated successfully',
    });
  } catch (error) {
    console.error('[Availability API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

/**
 * DELETE /api/availability/[id] - Delete availability slot
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate availability ID
    const validation = availabilityIdSchema.safeParse({ id });

    if (!validation.success) {
      return errorResponse('Invalid availability ID', validation.error.issues);
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Get availability to check court ownership
    const { data: availability, error: fetchError } = await supabase
      .from('availability')
      .select(
        `
        *,
        court:court (
          org_id
        )
      `
      )
      .eq('id', id)
      .single();

    if (fetchError || !availability) {
      return notFoundResponse('Availability slot');
    }

    // Check if user is admin/owner of the court's organization
    const court2 = availability.court as { org_id: string } | null;
    if (!court2) {
      return errorResponse('Court not found for this availability slot', [], 404);
    }

    const { data: membership, error: membershipError } = await supabase
      .from('org_member')
      .select('role')
      .eq('org_id', court2.org_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['admin', 'owner'].includes(membership.role)) {
      return errorResponse('Insufficient permissions', [], 403);
    }

    // Delete the availability slot (hard delete, not soft delete)
    const { error: deleteError } = await supabase.from('availability').delete().eq('id', id);

    if (deleteError) {
      console.error('[Availability API] Error deleting availability:', deleteError);
      return serverErrorResponse('Failed to delete availability', deleteError);
    }

    return successResponse({
      message: 'Availability slot deleted successfully',
    });
  } catch (error) {
    console.error('[Availability API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
