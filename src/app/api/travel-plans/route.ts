/**
 * Travel Plans API endpoint
 * POST /api/travel-plans - Create a new travel plan
 * GET /api/travel-plans - Get user's travel plans
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import {
  createTravelPlanSchema,
  travelPlansQuerySchema,
} from '@/lib/validations/travel-plan';

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
    const validation = createTravelPlanSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { destination_city, destination_country, location, start_date, end_date, preferences } =
      validation.data;

    // Convert location to PostGIS GEOGRAPHY if provided
    let locationGeography = null;
    if (location) {
      locationGeography = `POINT(${location.lng} ${location.lat})`;
    }

    // Create travel plan
    const { data: newPlan, error: createError } = await supabase
      .from('travel_plan')
      .insert({
        user_id: user.id,
        destination_city,
        destination_country,
        location: locationGeography,
        start_date,
        end_date,
        preferences,
        status: 'active',
      })
      .select('*')
      .single();

    if (createError) {
      console.error('[Travel Plans API] Error creating plan:', createError);
      return serverErrorResponse('Failed to create travel plan', createError);
    }

    // Update user_profile with travel mode active
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({
        travel_mode: true,
        travel_destination: destination_city,
      })
      .eq('id', user.id);

    if (updateError) {
      console.warn('[Travel Plans API] Failed to update user travel mode:', updateError);
      // Non-critical error, continue
    }

    return successResponse(newPlan, 'Travel plan created successfully', 201);
  } catch (error) {
    console.error('[Travel Plans API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function GET(request: Request) {
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

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status'),
      from_date: searchParams.get('from_date'),
      to_date: searchParams.get('to_date'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = travelPlansQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { status, from_date, to_date, limit, offset } = validation.data;

    // Build query - user can only see their own travel plans (enforced by RLS)
    let query = supabase
      .from('travel_plan')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (from_date) {
      query = query.gte('start_date', from_date);
    }

    if (to_date) {
      query = query.lte('end_date', to_date);
    }

    const { data: plans, error: plansError, count } = await query;

    if (plansError) {
      console.error('[Travel Plans API] Error fetching plans:', plansError);
      return serverErrorResponse('Failed to fetch travel plans', plansError);
    }

    return successResponse({
      travel_plans: plans || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Travel Plans API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
