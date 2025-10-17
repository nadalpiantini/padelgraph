/**
 * Bookings API endpoint
 * POST /api/bookings - Create a new booking
 * GET /api/bookings - Get user's bookings
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { createBookingSchema, bookingsQuerySchema } from '@/lib/validations/booking';

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
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { court_id, start_at, end_at, notes } = validation.data;

    // Fetch court details to get org_id and verify it's active
    const { data: court, error: courtError } = await supabase
      .from('court')
      .select('id, org_id, active')
      .eq('id', court_id)
      .single();

    if (courtError || !court) {
      return errorResponse('Court not found', undefined, 404);
    }

    if (!court.active) {
      return errorResponse('Court is not active', undefined, 400);
    }

    // Calculate duration in hours
    const startDate = new Date(start_at);
    const endDate = new Date(end_at);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Get day of week and time for pricing
    const dayOfWeek = startDate.getDay();
    const startTime = startDate.toTimeString().split(' ')[0]; // HH:MM:SS

    // Find applicable availability slot for pricing
    const { data: availabilitySlot } = await supabase
      .from('availability')
      .select('price_per_hour')
      .eq('court_id', court_id)
      .eq('day_of_week', dayOfWeek)
      .lte('start_time', startTime)
      .gte('end_time', startTime)
      .eq('active', true)
      .single();

    // Calculate total price
    const pricePerHour = availabilitySlot?.price_per_hour || 0;
    const totalPrice = pricePerHour * durationHours;

    // Create booking
    // Note: The check_booking_conflict() trigger will prevent conflicts
    const { data: newBooking, error: createError } = await supabase
      .from('booking')
      .insert({
        court_id,
        user_id: user.id,
        org_id: court.org_id,
        start_at,
        end_at,
        total_price: totalPrice,
        notes,
        status: 'pending',
      })
      .select(
        `
        *,
        court:court (
          id,
          name,
          type,
          surface
        ),
        user:user_profile!user_id (
          id,
          name,
          email
        )
      `
      )
      .single();

    if (createError) {
      // Check if it's a booking conflict error
      if (createError.message?.includes('Booking conflict')) {
        return errorResponse(
          'This time slot is already booked',
          { conflict: true },
          409
        );
      }

      console.error('[Bookings API] Error creating booking:', createError);
      return serverErrorResponse('Failed to create booking', createError);
    }

    return successResponse(newBooking, 'Booking created successfully', 201);
  } catch (error) {
    console.error('[Bookings API] Unexpected error:', error);
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
      court_id: searchParams.get('court_id'),
      from_date: searchParams.get('from_date'),
      to_date: searchParams.get('to_date'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = bookingsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { status, court_id, from_date, to_date, limit, offset } = validation.data;

    // Build query - user can only see their own bookings
    let query = supabase
      .from('booking')
      .select(
        `
        *,
        court:court (
          id,
          name,
          type,
          surface,
          organization:organization (
            id,
            name
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('start_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (court_id) {
      query = query.eq('court_id', court_id);
    }

    if (from_date) {
      query = query.gte('start_at', from_date);
    }

    if (to_date) {
      query = query.lte('start_at', to_date);
    }

    const { data: bookings, error: bookingsError, count } = await query;

    if (bookingsError) {
      console.error('[Bookings API] Error fetching bookings:', bookingsError);
      return serverErrorResponse('Failed to fetch bookings', bookingsError);
    }

    return successResponse({
      bookings: bookings || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Bookings API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
