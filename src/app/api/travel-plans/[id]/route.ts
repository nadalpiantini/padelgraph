/**
 * Travel Plan Detail API endpoint
 * GET /api/travel-plans/[id] - Get travel plan details
 * PUT /api/travel-plans/[id] - Update travel plan
 * DELETE /api/travel-plans/[id] - Cancel travel plan
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { updateTravelPlanSchema } from '@/lib/validations/travel-plan';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Fetch travel plan (RLS ensures user can only see their own plans)
    const { data: plan, error: planError } = await supabase
      .from('travel_plan')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (planError || !plan) {
      console.error('[Travel Plan Detail API] Error fetching plan:', planError);
      return notFoundResponse('Travel plan');
    }

    return successResponse(plan);
  } catch (error) {
    console.error('[Travel Plan Detail API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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
    const validation = updateTravelPlanSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const updateData = validation.data;

    // Convert location to PostGIS GEOGRAPHY if provided
    if (updateData.location) {
      const { lat, lng } = updateData.location;
      // @ts-expect-error - PostGIS geography format requires string conversion
      updateData.location = `POINT(${lng} ${lat})`;
    }

    // Update travel plan (RLS ensures user can only update their own plans)
    const { data: updatedPlan, error: updateError } = await supabase
      .from('travel_plan')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updatedPlan) {
      console.error('[Travel Plan Detail API] Error updating plan:', updateError);
      return serverErrorResponse('Failed to update travel plan', updateError);
    }

    // If status changed to completed/cancelled, update user travel mode
    if (updateData.status && ['completed', 'cancelled'].includes(updateData.status)) {
      // Check if user has any other active travel plans
      const { data: activePlans } = await supabase
        .from('travel_plan')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (!activePlans || activePlans.length === 0) {
        // No more active plans, disable travel mode
        await supabase
          .from('user_profile')
          .update({
            travel_mode: false,
            travel_destination: null,
          })
          .eq('id', user.id);
      }
    }

    return successResponse(updatedPlan, 'Travel plan updated successfully');
  } catch (error) {
    console.error('[Travel Plan Detail API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Soft delete - mark as cancelled instead of hard delete
    const { data: cancelledPlan, error: deleteError } = await supabase
      .from('travel_plan')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (deleteError || !cancelledPlan) {
      console.error('[Travel Plan Detail API] Error cancelling plan:', deleteError);
      return serverErrorResponse('Failed to cancel travel plan', deleteError);
    }

    // Check if user has any other active travel plans
    const { data: activePlans } = await supabase
      .from('travel_plan')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (!activePlans || activePlans.length === 0) {
      // No more active plans, disable travel mode
      await supabase
        .from('user_profile')
        .update({
          travel_mode: false,
          travel_destination: null,
        })
        .eq('id', user.id);
    }

    return successResponse(cancelledPlan, 'Travel plan cancelled successfully');
  } catch (error) {
    console.error('[Travel Plan Detail API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
